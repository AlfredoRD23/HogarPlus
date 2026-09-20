import { prisma } from "../../lib/prisma";
import { addDays, money, startOfDay } from "../../shared/utils";

export class DashboardService {
  async summary() {
    const today = startOfDay();
    const weekAgo = addDays(today, -7);

    const [
      clients,
      activeCredits,
      products,
      weeklyPayments,
      portfolio,
      merchandise,
      overdue,
      expensesWeek,
      recentPayments,
      levelGroups,
      productsCount,
      paymentsCount,
    ] = await Promise.all([
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.credit.findMany({ where: { status: "ACTIVE" }, select: { price: true, cost: true, balance: true, weeklyQuota: true } }),
      prisma.product.findMany({ select: { stock: true, cost: true, minStock: true, name: true, sku: true } }),
      prisma.payment.aggregate({
        where: { voidedAt: null, createdAt: { gte: weekAgo }, type: { not: "AFFILIATION" } },
        _sum: { amount: true },
      }),
      prisma.credit.aggregate({ where: { status: "ACTIVE" }, _sum: { balance: true, weeklyQuota: true } }),
      prisma.credit.aggregate({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, _sum: { cost: true, price: true } }),
      prisma.installment.count({
        where: {
          dueDate: { lt: today },
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          credit: { status: "ACTIVE" },
        },
      }),
      prisma.expense.aggregate({ where: { incurredOn: { gte: weekAgo } }, _sum: { amount: true } }),
      prisma.payment.findMany({
        where: { voidedAt: null },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { client: { select: { firstName: true, lastName: true } } },
      }),
      prisma.client.groupBy({ by: ["level"], _count: { _all: true } }),
      prisma.product.count(),
      prisma.payment.count({ where: { voidedAt: null } }),
    ]);

    const expectedWeekly = money(portfolio._sum.weeklyQuota ?? 0);
    const collectedWeekly = money(weeklyPayments._sum.amount ?? 0);
    const pending = money(portfolio._sum.balance ?? 0);
    const merchandiseCost = money(merchandise._sum.cost ?? 0);
    const soldPrice = money(merchandise._sum.price ?? 0);
    const grossMargin = soldPrice - merchandiseCost;
    const stockValue = products.reduce((acc, p) => acc + p.stock * money(p.cost), 0);
    const weeklyExpenses = money(expensesWeek._sum.amount ?? 0);
    const netHint = collectedWeekly - weeklyExpenses;
    const lowStock = products.filter((p) => p.stock <= p.minStock).slice(0, 6);

    return {
      kpis: {
        activeClients: clients,
        activeCredits: activeCredits.length,
        weeklyCollection: collectedWeekly,
        expectedWeekly,
        collectionRate: expectedWeekly > 0 ? Number(((collectedWeekly / expectedWeekly) * 100).toFixed(1)) : 0,
        pendingPortfolio: pending,
        overdueInstallments: overdue,
        merchandiseCost,
        grossMargin,
        stockValue,
        weeklyExpenses,
        availableCapitalHint: Number(Math.max(0, netHint).toFixed(2)),
      },
      levels: levelGroups.map((g) => ({ level: g.level, count: g._count._all })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        code: p.code,
        amount: money(p.amount),
        method: p.method,
        createdAt: p.createdAt,
        client: `${p.client.firstName} ${p.client.lastName}`,
        voided: Boolean(p.voidedAt),
      })),
      lowStock,
      setup: {
        hasClients: clients > 0,
        hasProducts: productsCount > 0,
        hasCredits: activeCredits.length > 0,
        hasPayments: paymentsCount > 0,
      },
    };
  }
}

export const dashboardService = new DashboardService();
