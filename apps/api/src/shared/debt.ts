import type { OutstandingCredit } from "@hogarplus/shared";
import { prisma } from "../lib/prisma";
import { AppError, money } from "./utils";

export async function outstandingCredits(clientId: string): Promise<OutstandingCredit[]> {
  const credits = await prisma.credit.findMany({
    where: {
      clientId,
      status: "ACTIVE",
      OR: [
        { balance: { gt: 0 } },
        { installments: { some: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } } },
      ],
    },
    include: {
      product: { select: { name: true } },
      installments: {
        where: { status: { not: "PAID" } },
        orderBy: { dueDate: "asc" },
        select: { dueDate: true, amount: true, status: true },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return credits.map((credit) => {
    const next = credit.installments[0];
    return {
      id: credit.id,
      code: credit.code,
      productName: credit.product.name,
      balance: money(credit.balance),
      weeklyQuota: money(credit.weeklyQuota),
      remaining: credit.installments.length,
      nextDueDate: next?.dueDate.toISOString() ?? null,
      nextAmount: next ? money(next.amount) : null,
      overdueCount: credit.installments.filter((item) => item.status === "OVERDUE").length,
    };
  });
}

export function debtError(credits: OutstandingCredit[]) {
  const first = credits[0];
  const message = first
    ? `Debe saldar ${first.productName} (${first.code}) antes de tomar otro producto`
    : "Debe saldar el crédito anterior antes de tomar otro producto";
  return new AppError(409, "HAS_DEBT", message, { credits });
}

export async function assertNoOutstandingDebt(clientId: string) {
  const credits = await outstandingCredits(clientId);
  if (credits.length > 0) throw debtError(credits);
}
