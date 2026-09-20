import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function money(value: Prisma.Decimal | number | string): number {
  return Number(new Prisma.Decimal(value).toFixed(2));
}

export function addMoney(a: Prisma.Decimal | number, b: Prisma.Decimal | number): Prisma.Decimal {
  return new Prisma.Decimal(a).plus(b);
}

export function subMoney(a: Prisma.Decimal | number, b: Prisma.Decimal | number): Prisma.Decimal {
  return new Prisma.Decimal(a).minus(b);
}

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addByFrequency(date: Date, frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY", index: number): Date {
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(date, index);
    case "BIWEEKLY":
      return addWeeks(date, index * 2);
    case "MONTHLY":
      return addMonths(date, index);
    default: {
      const _exhaustive: never = frequency;
      return _exhaustive;
    }
  }
}

export function pagination(query: { page?: unknown; pageSize?: unknown }) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20) || 20));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export async function nextCode(name: string, prefix: string, pad = 6): Promise<string> {
  const { prisma } = await import("../lib/prisma");
  const row = await prisma.sequence.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}${String(row.value).padStart(pad, "0")}`;
}
