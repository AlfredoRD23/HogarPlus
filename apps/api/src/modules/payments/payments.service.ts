import { Prisma } from "@prisma/client";
import { POINTS_RULES } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { AppError, money, nextCode, pagination, startOfDay } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import { clientsService } from "../clients/clients.service";
import type { z } from "zod";
import type { createPaymentSchema } from "./payments.schema";

export class PaymentsService {
  async list(query: { page?: unknown; pageSize?: unknown; clientId?: string; creditId?: string }) {
    const { skip, take, page, pageSize } = pagination(query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.creditId ? { creditId: query.creditId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { code: true, firstName: true, lastName: true } },
          credit: { select: { code: true, balance: true, downPayment: true, price: true } },
          createdBy: { select: { name: true } },
          allocations: true,
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async get(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        client: true,
        credit: { include: { product: true, installments: { orderBy: { number: "asc" } } } },
        allocations: { include: { installment: true } },
        createdBy: { select: { name: true } },
      },
    });
    if (!payment) throw new AppError(404, "NOT_FOUND", "Pago no encontrado");
    return payment;
  }

  async create(input: z.infer<typeof createPaymentSchema>, actorId: string, ip?: string) {
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");

    const credit = input.creditId
      ? await prisma.credit.findUnique({
          where: { id: input.creditId },
          include: { installments: { orderBy: { number: "asc" } } },
        })
      : await prisma.credit.findFirst({
          where: { clientId: client.id, status: "ACTIVE" },
          include: { installments: { orderBy: { number: "asc" } } },
          orderBy: { createdAt: "asc" },
        });

    if (!credit || credit.status !== "ACTIVE") {
      throw new AppError(400, "NO_CREDIT", "No hay un crédito activo para aplicar este pago");
    }
    if (credit.clientId !== client.id) {
      throw new AppError(400, "CREDIT_MISMATCH", "El crédito no pertenece al cliente");
    }

    const amount = new Prisma.Decimal(input.amount);
    if (amount.greaterThan(credit.balance)) {
      throw new AppError(
        400,
        "OVERPAY",
        `El pago excede el saldo pendiente de RD$ ${money(credit.balance).toFixed(2)}`,
      );
    }

    const today = startOfDay();
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          code: await nextCode("payment", "PAG"),
          clientId: client.id,
          creditId: credit.id,
          amount,
          method: input.method,
          type: "INSTALLMENT",
          reference: input.reference,
          notes: input.notes,
          createdById: actorId,
        },
      });

      let remaining = amount;
      let appliedAdvance = false;
      let appliedLate = false;
      let appliedOnTime = false;

      const installments = await tx.installment.findMany({
        where: { creditId: credit.id, status: { not: "PAID" } },
        orderBy: { number: "asc" },
      });

      for (const inst of installments) {
        if (remaining.lessThanOrEqualTo(0)) break;
        const due = new Prisma.Decimal(inst.amount).minus(inst.paidAmount);
        if (due.lessThanOrEqualTo(0)) continue;

        const apply = remaining.lessThan(due) ? remaining : due;
        const paidAmount = new Prisma.Decimal(inst.paidAmount).plus(apply);
        const fullyPaid = paidAmount.greaterThanOrEqualTo(inst.amount);
        const dueDate = startOfDay(inst.dueDate);

        let status: Prisma.InstallmentUpdateInput["status"] = "PARTIAL";
        if (fullyPaid) {
          if (today < dueDate) {
            status = "PREPAID";
            appliedAdvance = true;
          } else if (today > dueDate) {
            status = "PAID";
            appliedLate = true;
          } else {
            status = "PAID";
            appliedOnTime = true;
          }
        } else if (today > dueDate) {
          status = "OVERDUE";
          appliedLate = true;
        }

        await tx.installment.update({
          where: { id: inst.id },
          data: { paidAmount, status },
        });
        await tx.paymentAllocation.create({
          data: { paymentId: payment.id, installmentId: inst.id, amount: apply },
        });
        remaining = remaining.minus(apply);
      }

      const newBalance = new Prisma.Decimal(credit.balance).minus(amount);
      const completed = newBalance.lessThanOrEqualTo(0);

      await tx.credit.update({
        where: { id: credit.id },
        data: {
          balance: newBalance,
          status: completed ? "COMPLETED" : "ACTIVE",
          completedAt: completed ? new Date() : undefined,
        },
      });

      if (appliedAdvance && !appliedLate) {
        await tx.payment.update({ where: { id: payment.id }, data: { type: "ADVANCE" } });
        await clientsService.addPoints(tx, client.id, "ADVANCE", POINTS_RULES.ADVANCE, {
          paymentId: payment.id,
          creditId: credit.id,
          note: "Pago adelantado",
        });
      } else if (appliedOnTime && !appliedLate) {
        await clientsService.addPoints(tx, client.id, "WEEKLY_ON_TIME", POINTS_RULES.WEEKLY_ON_TIME, {
          paymentId: payment.id,
          creditId: credit.id,
          note: "Pago semanal a tiempo",
        });
      } else {
        await clientsService.addPoints(tx, client.id, "LATE_PAYMENT", POINTS_RULES.LATE_PAYMENT, {
          paymentId: payment.id,
          creditId: credit.id,
          note: "Pago atrasado",
        });
      }

      if (completed) {
        await clientsService.addPoints(tx, client.id, "PRODUCT_COMPLETED", POINTS_RULES.PRODUCT_COMPLETED, {
          paymentId: payment.id,
          creditId: credit.id,
          note: "Completar un producto",
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          allocations: { include: { installment: true } },
          credit: { include: { installments: { orderBy: { number: "asc" } } } },
          client: { select: { firstName: true, lastName: true, points: true, level: true } },
        },
      });
    });

    await writeAudit({
      userId: actorId,
      action: "CREATE",
      entity: "Payment",
      entityId: result.id,
      after: { code: result.code, amount: money(result.amount) },
      ip,
    });

    return result;
  }

  async voidPayment(id: string, reason: string, actorId: string, ip?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!payment) throw new AppError(404, "NOT_FOUND", "Pago no encontrado");
    if (payment.voidedAt) throw new AppError(409, "ALREADY_VOID", "El pago ya fue anulado");
    if (payment.type === "AFFILIATION") {
      throw new AppError(400, "CANNOT_VOID", "La afiliación no se anula desde este flujo");
    }

    await prisma.$transaction(async (tx) => {
      for (const alloc of payment.allocations) {
        if (!alloc.installmentId) continue;
        const inst = await tx.installment.findUniqueOrThrow({ where: { id: alloc.installmentId } });
        const paidAmount = new Prisma.Decimal(inst.paidAmount).minus(alloc.amount);
        await tx.installment.update({
          where: { id: inst.id },
          data: {
            paidAmount,
            status: paidAmount.lessThanOrEqualTo(0) ? "PENDING" : "PARTIAL",
          },
        });
      }

      if (payment.creditId) {
        const credit = await tx.credit.findUniqueOrThrow({ where: { id: payment.creditId } });
        await tx.credit.update({
          where: { id: credit.id },
          data: {
            balance: new Prisma.Decimal(credit.balance).plus(payment.amount),
            status: "ACTIVE",
            completedAt: null,
          },
        });
      }

      await tx.payment.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: actorId, voidReason: reason },
      });
    });

    await writeAudit({
      userId: actorId,
      action: "VOID",
      entity: "Payment",
      entityId: id,
      after: { reason },
      ip,
    });

    return this.get(id);
  }
}

export const paymentsService = new PaymentsService();
