import { z } from "zod";

export const createCreditSchema = z.object({
  clientId: z.string().min(1),
  productId: z.string().min(1),
  weeklyQuota: z.number().positive().optional(),
  weeks: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});
