import { prisma } from "../../lib/prisma";
import { DEFAULTS } from "@hogarplus/shared";

const KEYS = [
  "affiliationFee",
  "weeklyQuota",
  "defaultWeeks",
  "cashReservePercent",
  "companyName",
  "companyCity",
] as const;

export class SettingsService {
  async getAll() {
    const rows = await prisma.setting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      affiliationFee: Number(map.affiliationFee ?? DEFAULTS.affiliationFee),
      weeklyQuota: Number(map.weeklyQuota ?? DEFAULTS.weeklyQuota),
      defaultWeeks: Number(map.defaultWeeks ?? DEFAULTS.weeks),
      cashReservePercent: Number(map.cashReservePercent ?? 15),
      companyName: map.companyName ?? "HogarPlus",
      companyCity: map.companyCity ?? "República Dominicana",
    };
  }

  async upsert(values: Record<string, string | number>, _userId: string) {
    for (const [key, value] of Object.entries(values)) {
      if (!KEYS.includes(key as (typeof KEYS)[number])) continue;
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    return this.getAll();
  }
}

export const settingsService = new SettingsService();
