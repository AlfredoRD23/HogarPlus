import { Prisma } from "@prisma/client";
import { catalogsForLevel } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { settingsService } from "../settings/settings.service";
import { addWeeks, AppError, money, nextCode, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { z } from "zod";
import type { createCreditSchema } from "./credits.schema";

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
    const { skip, take, page, pageSize } = pagination(query);
    const where: Prisma.CreditWhereInput = {
      ...(query.status ? { status: query.status as Prisma.EnumCreditStatusFilter["equals"] } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search } },
              { client: { firstName: { contains: query.search } } },
              { client: { lastName: { contains: query.search } } },
              { client: { documentId: { contains: query.search } } },
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
        `El nivel ${client.level} no tiene acceso al catálogo ${product.catalogTier}`,
      );
    }
    if (product.catalogTier === "C" && !client.catalogApproved) {
      throw new AppError(400, "NEEDS_EVALUATION", "El catálogo C requiere evaluación de capacidad de pago");
    }

    const active = await prisma.credit.count({ where: { clientId: client.id, status: "ACTIVE" } });
    if (active >= 2) {
      throw new AppError(400, "CREDIT_LIMIT", "El cliente ya tiene el máximo de créditos activos");
    }

    const settings = await settingsService.getAll();
    const weeks = input.weeks ?? settings.defaultWeeks;
    const weeklyQuota = new Prisma.Decimal(input.weeklyQuota ?? settings.weeklyQuota);
    const price = product.price;
    const expected = weeklyQuota.times(weeks);
    if (expected.lessThan(price)) {
      throw new AppError(400, "QUOTA_TOO_LOW", "Las cuotas no cubren el precio del producto");
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();

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
          balance: price,
          affiliationFee: 0,
          status: "ACTIVE",
          startDate,
          deliveredAt: new Date(),
          notes: input.notes,
          createdById: actorId,
        },
      });

      await tx.installment.createMany({
        data: Array.from({ length: weeks }, (_, i) => {
          const amount = i === weeks - 1 ? price.minus(weeklyQuota.times(weeks - 1)) : weeklyQuota;
          return {
            creditId: created.id,
            number: i + 1,
            dueDate: addWeeks(startDate, i),
            amount,
            status: "PENDING" as const,
          };
        }),
      });

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
}

export const creditsService = new CreditsService();
