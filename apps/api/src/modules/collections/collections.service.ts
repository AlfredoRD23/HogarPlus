import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { endOfDay, money, startOfDay } from "../../shared/utils";
import type { z } from "zod";
import type { noteSchema } from "./collections.schema";

function installmentOpenWhere(): Prisma.InstallmentWhereInput {
  return {
    status: { not: "PAID" },
    credit: { status: "ACTIVE" },
  };
}

export class CollectionsService {
  async board() {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const [onTime, dueToday, overdue, advanced, expectedAgg, receivedAgg] = await Promise.all([
      prisma.credit.findMany({
        where: {
          status: "ACTIVE",
          installments: {
            none: {
              dueDate: { lte: todayEnd },
              status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
            },
          },
        },
        include: {
          client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, level: true } },
          product: { select: { name: true } },
          installments: { where: { status: { not: "PAID" } }, orderBy: { dueDate: "asc" }, take: 1 },
        },
      }),
      prisma.installment.findMany({
        where: {
          ...installmentOpenWhere(),
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "PARTIAL"] },
        },
        include: {
          credit: {
            include: {
              client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, level: true } },
              product: { select: { name: true } },
            },
          },
        },
      }),
      prisma.installment.findMany({
        where: {
          ...installmentOpenWhere(),
          dueDate: { lt: todayStart },
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        include: {
          credit: {
            include: {
              client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, level: true } },
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.credit.findMany({
        where: {
          status: "ACTIVE",
          installments: { some: { status: "PREPAID" } },
        },
        include: {
          client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, level: true } },
          product: { select: { name: true } },
          installments: { where: { status: { not: "PAID" } }, orderBy: { dueDate: "asc" } },
        },
      }),
      prisma.installment.aggregate({
        where: {
          dueDate: { gte: todayStart, lte: todayEnd },
          credit: { status: { in: ["ACTIVE", "COMPLETED"] } },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { voidedAt: null, createdAt: { gte: todayStart, lte: todayEnd }, type: { not: "AFFILIATION" } },
        _sum: { amount: true },
      }),
    ]);

    const expected = money(expectedAgg._sum.amount ?? 0);
    const received = money(receivedAgg._sum.amount ?? 0);
    const pending = Math.max(0, expected - received);

    return {
      buckets: {
        onTime,
        dueToday,
        overdue,
        advanced,
      },
      kpis: {
        expected,
        received,
        pending,
        rate: expected > 0 ? Number(((received / expected) * 100).toFixed(1)) : 0,
        overdueCount: overdue.length,
      },
    };
  }

  async addNote(input: z.infer<typeof noteSchema>, userId: string) {
    return prisma.collectionNote.create({
      data: {
        clientId: input.clientId,
        creditId: input.creditId,
        channel: input.channel,
        note: input.note,
        nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : null,
        userId,
      },
      include: { user: { select: { name: true } } },
    });
  }
}

export const collectionsService = new CollectionsService();
