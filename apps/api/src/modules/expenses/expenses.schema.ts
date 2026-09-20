import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.enum(["PAYROLL", "TRANSPORT", "MARKETING", "PROCESSING", "WARRANTY", "TAX", "OPERATIONS", "OTHER"]),
  amount: z.number().positive(),
  description: z.string().min(3),
  incurredOn: z.string(),
});
