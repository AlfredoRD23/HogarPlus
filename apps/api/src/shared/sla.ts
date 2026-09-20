import { prisma } from "../lib/prisma";
import { startOfDay } from "./utils";

export type SlaRunResult = {
  at: string;
  markedOverdue: number;
};

let lastRun: SlaRunResult | null = null;

export function getLastSlaRun() {
  return lastRun;
}

export async function applySla(): Promise<SlaRunResult> {
  const overdue = await prisma.installment.updateMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lt: startOfDay() },
    },
    data: { status: "OVERDUE" },
  });

  lastRun = {
    at: new Date().toISOString(),
    markedOverdue: overdue.count,
  };
  return lastRun;
}

export async function markOverdueInstallments() {
  await applySla();
}
