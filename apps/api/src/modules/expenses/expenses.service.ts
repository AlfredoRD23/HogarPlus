import { prisma } from "../../lib/prisma";
import { AppError, pagination } from "../../shared/utils";
import type { z } from "zod";
import type { createExpenseSchema, updateExpenseSchema } from "./expenses.schema";

export class ExpensesService {
  async list(query: { page?: unknown; pageSize?: unknown }) {
    const { skip, take, page, pageSize } = pagination(query);
    const [items, total] = await prisma.$transaction([
      prisma.expense.findMany({
        skip,
        take,
        orderBy: { incurredOn: "desc" },
        include: { user: { select: { name: true } } },
      }),
      prisma.expense.count(),
    ]);
    return { items, meta: { page, pageSize, total } };
  }

  async create(input: z.infer<typeof createExpenseSchema>, userId: string) {
    return prisma.expense.create({
      data: {
        category: input.category,
        amount: input.amount,
        description: input.description,
        incurredOn: new Date(input.incurredOn),
        userId,
      },
    });
  }

  async update(id: string, input: z.infer<typeof updateExpenseSchema>) {
    const before = await prisma.expense.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Gasto no encontrado");
    if (before.voidedAt) throw new AppError(400, "ALREADY_VOID", "Este gasto ya está anulado y no se puede editar");
    return prisma.expense.update({
      where: { id },
      data: {
        category: input.category,
        amount: input.amount,
        description: input.description,
        incurredOn: input.incurredOn ? new Date(input.incurredOn) : undefined,
      },
    });
  }

  async voidExpense(id: string, reason: string) {
    const before = await prisma.expense.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Gasto no encontrado");
    if (before.voidedAt) throw new AppError(409, "ALREADY_VOID", "Este gasto ya está anulado");
    return prisma.expense.update({
      where: { id },
      data: { voidedAt: new Date(), voidReason: reason },
    });
  }
}

export const expensesService = new ExpensesService();
