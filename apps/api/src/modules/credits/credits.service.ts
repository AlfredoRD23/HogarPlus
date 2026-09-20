import { Prisma } from "@prisma/client";
import {
  catalogsForLevel,
  CATALOG_TIER_LABELS,
  digitsOnly,
  financedAmount,
  installmentAmounts,
  LEVEL_LABELS,
  type PaymentFrequency,
} from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { settingsService } from "../settings/settings.service";
import { markOverdueInstallments } from "../../shared/sla";
import { addByFrequency, AppError, money, nextCode, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { z } from "zod";
import type { createCreditSchema, updateCreditSchema } from "./credits.schema";

const creditInclude = {
  client: {
    select: {
      id: true,
      code: true,
      firstName: true,
      lastName: true,
      phone: true,
      level: true,
      points: true,
      affiliationPaid: true,
      catalogApproved: true,
    },
  },
  product: true,
  installments: { orderBy: { number: "asc" as const } },
  createdBy: { select: { name: true } },
};

export class CreditsService {
  async list(query: { page?: unknown; pageSize?: unknown; search?: string; status?: string; clientId?: string }) {
    await markOverdueInstallments();
    const { skip, take, page, pageSize } = pagination(query);
    const search = query.search?.trim();
    const digits = search ? digitsOnly(search) : "";
    const where: Prisma.CreditWhereInput = {
      ...(query.status ? { status: query.status as Prisma.EnumCreditStatusFilter["equals"] } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { client: { firstName: { contains: search } } },
              { client: { lastName: { contains: search } } },
              { client: { documentId: { contains: digits.length >= 3 ? digits : search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.credit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: creditInclude,
      }),
      prisma.credit.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async get(id: string) {
    await markOverdueInstallments();
    const credit = await prisma.credit.findUnique({
      where: { id },
      include: {
        ...creditInclude,
        payments: { where: { voidedAt: null }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!credit) throw new AppError(404, "NOT_FOUND", "Crédito no encontrado");
    return credit;
  }

  async create(input: z.infer<typeof createCreditSchema>, actorId: string, ip?: string) {
    const [client, product] = await Promise.all([
      prisma.client.findUnique({ where: { id: input.clientId } }),
      prisma.product.findUnique({ where: { id: input.productId } }),
    ]);

    if (!client) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    if (!product || product.status !== "ACTIVE") throw new AppError(404, "NOT_FOUND", "Producto no disponible");
    if (client.status !== "ACTIVE") throw new AppError(400, "CLIENT_INACTIVE", "El cliente no está activo");
    if (!client.affiliationPaid) {
      throw new AppError(400, "NO_AFFILIATION", "El cliente debe completar la afiliación antes de comprar");
    }
    if (product.stock < 1) throw new AppError(400, "NO_STOCK", "No hay inventario del producto");

    const allowed = catalogsForLevel(client.level);
    if (!allowed.includes(product.catalogTier)) {
      throw new AppError(
        400,
        "CATALOG_LOCKED",
        `El nivel ${LEVEL_LABELS[client.level]} no puede tomar productos ${CATALOG_TIER_LABELS[product.catalogTier]}`,
      );
    }
    if (product.catalogTier === "C" && !client.catalogApproved) {
      throw new AppError(400, "NEEDS_EVALUATION", "Los productos Oro requieren aprobación de capacidad de pago");
    }

    const active = await prisma.credit.count({ where: { clientId: client.id, status: "ACTIVE" } });
    if (active >= 2) {
      throw new AppError(400, "CREDIT_LIMIT", "El cliente ya tiene el máximo de créditos activos");
    }

    const settings = await settingsService.getAll();
    const frequency = input.frequency ?? "WEEKLY";
    const downPayment = Number(input.downPayment ?? 0);
    const price = money(product.price);
    if (downPayment >= price) {
      throw new AppError(400, "DOWN_PAYMENT_HIGH", "El pago inicial debe ser menor que el precio del producto");
    }
    const weeks = input.weeks ?? settings.defaultWeeks;
    const amounts = installmentAmounts(price, downPayment, weeks);
    const weeklyQuota = new Prisma.Decimal(input.weeklyQuota ?? amounts[0] ?? settings.weeklyQuota);
    const financed = financedAmount(price, downPayment);
    const planned = amounts.reduce((sum, amount) => sum + amount, 0);
    if (planned + 0.05 < financed) {
      throw new AppError(400, "QUOTA_TOO_LOW", "Las cuotas no cubren el saldo después del pago inicial");
    }

    const startDate = input.startDate ? new Date(`${input.startDate}T12:00:00`) : new Date();

    const credit = await prisma.$transaction(async (tx) => {
      const created = await tx.credit.create({
        data: {
          code: await nextCode("credit", "CRD"),
          clientId: client.id,
          productId: product.id,
          price,
          cost: product.cost,
          weeklyQuota,
          weeks,
          downPayment,
          frequency,
          balance: financed,
          affiliationFee: 0,
          status: "ACTIVE",
          startDate,
          deliveredAt: new Date(),
          notes: input.notes,
          createdById: actorId,
        },
      });

      await tx.installment.createMany({
        data: amounts.map((amount, i) => ({
          creditId: created.id,
          number: i + 1,
          dueDate: addByFrequency(startDate, frequency, i),
          amount,
          status: "PENDING" as const,
        })),
      });

      if (downPayment > 0) {
        await tx.payment.create({
          data: {
            code: await nextCode("payment", "PAG"),
            clientId: client.id,
            creditId: created.id,
            amount: downPayment,
            method: "CASH",
            type: "DOWN_PAYMENT",
            notes: "Pago inicial al entregar el producto",
            createdById: actorId,
          },
        });
      }

      await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 } } });
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "OUT",
          quantity: 1,
          unitCost: product.cost,
          reason: `Entrega crédito ${created.code}`,
          creditId: created.id,
          userId: actorId,
        },
      });

      return tx.credit.findUniqueOrThrow({ where: { id: created.id }, include: creditInclude });
    });

    await writeAudit({
      userId: actorId,
      action: "CREATE",
      entity: "Credit",
      entityId: credit.id,
      after: { code: credit.code, price: money(credit.price), cost: money(credit.cost) },
      ip,
    });

    return credit;
  }

  async update(id: string, input: z.infer<typeof updateCreditSchema>, actorId: string, ip?: string) {
    const before = await prisma.credit.findUnique({
      where: { id },
      include: { installments: true, payments: { where: { voidedAt: null } } },
    });
    if (!before) throw new AppError(404, "NOT_FOUND", "Crédito no encontrado");
    if (before.status !== "ACTIVE") {
      throw new AppError(400, "CREDIT_CLOSED", "Solo se puede editar un crédito activo");
    }

    const planTouched =
      input.weeklyQuota !== undefined ||
      input.weeks !== undefined ||
      input.downPayment !== undefined ||
      input.frequency !== undefined ||
      input.startDate !== undefined;

    const hasInstallmentPayments = before.installments.some((item) => Number(item.paidAmount) > 0);
    if (planTouched && hasInstallmentPayments) {
      throw new AppError(400, "PLAN_LOCKED", "Ya hay cuotas cobradas. No se puede cambiar el plan, solo la nota");
    }

    const credit = await prisma.$transaction(async (tx) => {
      if (!planTouched) {
        return tx.credit.update({
          where: { id },
          data: { notes: input.notes },
          include: creditInclude,
        });
      }

      const price = money(before.price);
      const downPayment = Number(input.downPayment ?? before.downPayment);
      if (downPayment >= price) {
        throw new AppError(400, "DOWN_PAYMENT_HIGH", "El pago inicial debe ser menor que el precio del producto");
      }
      const weeks = input.weeks ?? before.weeks;
      const frequency = (input.frequency ?? before.frequency) as PaymentFrequency;
      const startDate = input.startDate ? new Date(`${input.startDate}T12:00:00`) : before.startDate;
      const amounts = installmentAmounts(price, downPayment, weeks);
      const weeklyQuota = new Prisma.Decimal(input.weeklyQuota ?? amounts[0] ?? money(before.weeklyQuota));
      const financed = financedAmount(price, downPayment);

      await tx.installment.deleteMany({ where: { creditId: id } });
      await tx.installment.createMany({
        data: amounts.map((amount, i) => ({
          creditId: id,
          number: i + 1,
          dueDate: addByFrequency(startDate, frequency, i),
          amount,
          status: "PENDING" as const,
        })),
      });

      const initial = before.payments.find((payment) => payment.type === "DOWN_PAYMENT");
      if (downPayment > 0) {
        if (initial) {
          await tx.payment.update({ where: { id: initial.id }, data: { amount: downPayment } });
        } else {
          await tx.payment.create({
            data: {
              code: await nextCode("payment", "PAG"),
              clientId: before.clientId,
              creditId: id,
              amount: downPayment,
              method: "CASH",
              type: "DOWN_PAYMENT",
              notes: "Pago inicial al entregar el producto",
              createdById: actorId,
            },
          });
        }
      } else if (initial) {
        await tx.payment.delete({ where: { id: initial.id } });
      }

      return tx.credit.update({
        where: { id },
        data: {
          weeklyQuota,
          weeks,
          downPayment,
          frequency,
          startDate,
          balance: financed,
          notes: input.notes,
        },
        include: creditInclude,
      });
    });

    await writeAudit({
      userId: actorId,
      action: "UPDATE",
      entity: "Credit",
      entityId: id,
      before: { weeks: before.weeks, downPayment: money(before.downPayment) },
      after: { weeks: credit.weeks, downPayment: money(credit.downPayment) },
      ip,
    });
    return credit;
  }
}

export const creditsService = new CreditsService();
