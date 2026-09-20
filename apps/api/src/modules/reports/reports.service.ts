import { prisma } from "../../lib/prisma";
import { money, startOfDay, addDays } from "../../shared/utils";
import { settingsService } from "../settings/settings.service";

export class ReportsService {
  async finance() {
    const today = startOfDay();
    const from = addDays(today, -90);
    const settings = await settingsService.getAll();

    const [credits, payments, expenses, clients, avgCost] = await Promise.all([
      prisma.credit.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true, price: true, cost: true, balance: true, status: true, weeklyQuota: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: from }, voidedAt: null },
        select: { createdAt: true, amount: true, type: true, method: true },
      }),
      prisma.expense.findMany({
        where: { incurredOn: { gte: from } },
        select: { incurredOn: true, amount: true, category: true },
      }),
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.product.aggregate({ _avg: { cost: true } }),
    ]);

    const sold = credits.reduce((a, c) => a + money(c.price), 0);
    const cost = credits.reduce((a, c) => a + money(c.cost), 0);
    const collected = payments.filter((p) => p.type !== "AFFILIATION").reduce((a, p) => a + money(p.amount), 0);
    const affiliation = payments.filter((p) => p.type === "AFFILIATION").reduce((a, p) => a + money(p.amount), 0);
    const expenseTotal = expenses.reduce((a, e) => a + money(e.amount), 0);
    const pending = credits.filter((c) => c.status === "ACTIVE").reduce((a, c) => a + money(c.balance), 0);

    const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + money(p.amount);
      return acc;
    }, {});

    const weeklyExpected = credits
      .filter((c) => c.status === "ACTIVE")
      .reduce((a, c) => a + money(c.weeklyQuota), 0);

    const weekMap = new Map<string, number>();
    for (const p of payments) {
      if (p.type === "AFFILIATION") continue;
      const d = new Date(p.createdAt);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + money(p.amount));
    }
    const weeklySeries = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, amount]) => ({ week, amount }));

    const unitCost = money(avgCost._avg.cost ?? settings.weeklyQuota);
    const current = {
      clients,
      merchandiseCapital: Number((clients * unitCost).toFixed(2)),
      weeklyCollection: weeklyExpected,
    };

    return {
      windowDays: 90,
      activeClients: clients,
      salesPrice: sold,
      merchandiseCost: cost,
      grossMargin: sold - cost,
      collections: collected,
      affiliationIncome: affiliation,
      expenses: expenseTotal,
      pendingPortfolio: pending,
      theoreticalNet: collected + affiliation - expenseTotal,
      note: "La utilidad neta real exige conciliar caja, impuestos, garantías y morosidad.",
      byMethod,
      weeklyExpected,
      weeklySeries,
      currentScale: current,
      unitCostUsed: unitCost,
      quotaUsed: settings.weeklyQuota,
    };
  }
}

export const reportsService = new ReportsService();
