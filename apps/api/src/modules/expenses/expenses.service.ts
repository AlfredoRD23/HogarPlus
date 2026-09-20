import { prisma } from "../../lib/prisma";
import { pagination } from "../../shared/utils";
import type { z } from "zod";
import type { createExpenseSchema } from "./expenses.schema";

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
}

export const expensesService = new ExpensesService();
