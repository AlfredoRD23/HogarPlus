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
  overdueCount?: number;
  overdueTotal?: number;
  lastNote?: string | null;
};

function nameOf(client: { firstName: string; lastName: string }) {
  return `${client.firstName} ${client.lastName}`;
}

function cardFromClientCredit(
  client: {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    phone: string;
    city: string | null;
    level: ClientLevel;
  },
  credit: { id: string; code: string; balance: Prisma.Decimal | number; weeklyQuota?: Prisma.Decimal | number },
  productName: string,
  extra: { amount: number; dueDate: Date | null; daysLate: number; overdueCount?: number; overdueTotal?: number },
): CollectionCard {
  return {
    id: `${credit.id}-${extra.dueDate?.toISOString() ?? "open"}`,
    clientId: client.id,
    creditId: credit.id,
    name: nameOf(client),
    code: client.code,
    phone: client.phone,
    city: client.city,
    level: client.level,
    product: productName,
    creditCode: credit.code,
    amount: extra.amount,
    balance: money(credit.balance),
    dueDate: extra.dueDate ? extra.dueDate.toISOString() : null,
    daysLate: extra.daysLate,
    overdueCount: extra.overdueCount,
    overdueTotal: extra.overdueTotal,
  };
}

async function attachLatestNotes(cards: CollectionCard[]): Promise<CollectionCard[]> {
  const ids = [...new Set(cards.map((card) => card.clientId))];
  if (ids.length === 0) return cards;
  const notes = await prisma.collectionNote.findMany({
    where: { clientId: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: { clientId: true, note: true },
  });
  const latest = new Map<string, string>();
  for (const note of notes) {
    if (!latest.has(note.clientId)) latest.set(note.clientId, note.note);
  }
  return cards.map((card) => ({ ...card, lastNote: latest.get(card.clientId) ?? null }));
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

    const overdueByCredit = new Map<
      string,
      { inst: (typeof overdue)[number]; count: number; total: Prisma.Decimal; oldest: Date }
    >();
    for (const inst of overdue) {
      const current = overdueByCredit.get(inst.creditId);
      if (!current) {
        overdueByCredit.set(inst.creditId, { inst, count: 1, total: inst.amount, oldest: inst.dueDate });
        continue;
      }
      current.count += 1;
      current.total = current.total.plus(inst.amount);
      if (inst.dueDate < current.oldest) {
        current.oldest = inst.dueDate;
        current.inst = inst;
      }
    }

    const buckets = {
      onTime: onTime.map((credit) =>
        cardFromClientCredit(credit.client, credit, credit.product.name, {
          amount: money(credit.installments[0]?.amount ?? credit.weeklyQuota),
          dueDate: credit.installments[0]?.dueDate ?? null,
          daysLate: 0,
        }),
      ),
      dueToday: dueToday.map((inst) =>
        cardFromClientCredit(inst.credit.client, inst.credit, inst.credit.product.name, {
          amount: money(inst.amount),
          dueDate: inst.dueDate,
          daysLate: 0,
        }),
      ),
      overdue: [...overdueByCredit.values()].map(({ inst, count, total, oldest }) =>
        cardFromClientCredit(inst.credit.client, inst.credit, inst.credit.product.name, {
          amount: money(inst.amount),
          dueDate: oldest,
          daysLate: calendarDaysLate(oldest),
          overdueCount: count,
          overdueTotal: money(total),
        }),
      ),
      advanced: advanced.map((credit) =>
        cardFromClientCredit(credit.client, credit, credit.product.name, {
          amount: money(credit.installments[0]?.amount ?? credit.weeklyQuota),
          dueDate: credit.installments[0]?.dueDate ?? null,
          daysLate: 0,
        }),
      ),
    };

    return {
      buckets: {
        onTime: await attachLatestNotes(buckets.onTime),
        dueToday: await attachLatestNotes(buckets.dueToday),
        overdue: await attachLatestNotes(buckets.overdue),
        advanced: await attachLatestNotes(buckets.advanced),
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
