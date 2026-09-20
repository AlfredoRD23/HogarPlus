import { Prisma } from "@prisma/client";
import { calendarDaysLate, type ClientLevel } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { markOverdueInstallments } from "../../shared/sla";
import { endOfDay, money, startOfDay } from "../../shared/utils";
import type { z } from "zod";
import type { noteSchema } from "./collections.schema";

function installmentOpenWhere(): Prisma.InstallmentWhereInput {
  return {
    status: { not: "PAID" },
    credit: { status: "ACTIVE" },
  };
}

const clientSelect = {
  id: true,
  code: true,
  firstName: true,
  lastName: true,
  phone: true,
  city: true,
  level: true,
} satisfies Prisma.ClientSelect;

export type CollectionCard = {
  id: string;
  clientId: string;
  creditId: string;
  name: string;
  code: string;
  phone: string;
  city: string | null;
  level: ClientLevel;
  product: string;
  creditCode: string;
  amount: number;
  balance: number;
  dueDate: string | null;
  daysLate: number;
};

function nameOf(client: { firstName: string; lastName: string }) {
  return `${client.firstName} ${client.lastName}`;
}

export class CollectionsService {
  async board() {
    await markOverdueInstallments();
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
          client: { select: clientSelect },
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
              client: { select: clientSelect },
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
              client: { select: clientSelect },
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
          client: { select: clientSelect },
          product: { select: { name: true } },
          installments: { where: { status: { not: "PAID" } }, orderBy: { dueDate: "asc" }, take: 1 },
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
        onTime: onTime.map((credit): CollectionCard => {
          const next = credit.installments[0];
          return {
            id: credit.id,
            clientId: credit.client.id,
            creditId: credit.id,
            name: nameOf(credit.client),
            code: credit.client.code,
            phone: credit.client.phone,
            city: credit.client.city,
            level: credit.client.level,
            product: credit.product.name,
            creditCode: credit.code,
            amount: money(next?.amount ?? credit.weeklyQuota),
            balance: money(credit.balance),
            dueDate: next?.dueDate.toISOString() ?? null,
            daysLate: 0,
          };
        }),
        dueToday: dueToday.map((inst): CollectionCard => ({
          id: inst.id,
          clientId: inst.credit.client.id,
          creditId: inst.credit.id,
          name: nameOf(inst.credit.client),
          code: inst.credit.client.code,
          phone: inst.credit.client.phone,
          city: inst.credit.client.city,
          level: inst.credit.client.level,
          product: inst.credit.product.name,
          creditCode: inst.credit.code,
          amount: money(inst.amount),
          balance: money(inst.credit.balance),
          dueDate: inst.dueDate.toISOString(),
          daysLate: 0,
        })),
        overdue: overdue.map((inst): CollectionCard => ({
          id: inst.id,
          clientId: inst.credit.client.id,
          creditId: inst.credit.id,
          name: nameOf(inst.credit.client),
          code: inst.credit.client.code,
          phone: inst.credit.client.phone,
          city: inst.credit.client.city,
          level: inst.credit.client.level,
          product: inst.credit.product.name,
          creditCode: inst.credit.code,
          amount: money(inst.amount),
          balance: money(inst.credit.balance),
          dueDate: inst.dueDate.toISOString(),
          daysLate: calendarDaysLate(inst.dueDate),
        })),
        advanced: advanced.map((credit): CollectionCard => {
          const next = credit.installments[0];
          return {
            id: credit.id,
            clientId: credit.client.id,
            creditId: credit.id,
            name: nameOf(credit.client),
            code: credit.client.code,
            phone: credit.client.phone,
            city: credit.client.city,
            level: credit.client.level,
            product: credit.product.name,
            creditCode: credit.code,
            amount: money(next?.amount ?? credit.weeklyQuota),
            balance: money(credit.balance),
            dueDate: next?.dueDate.toISOString() ?? null,
            daysLate: 0,
          };
        }),
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
