import { z } from "zod";
import { isValidIsoDate } from "@hogarplus/shared";

export const createExpenseSchema = z.object({
  category: z.enum(["PAYROLL", "TRANSPORT", "MARKETING", "PROCESSING", "WARRANTY", "TAX", "OPERATIONS", "OTHER"]),
  amount: z.coerce.number().positive("El monto debe ser mayor que 0").max(9_999_999.99),
  description: z.string().trim().min(3, "La descripción debe tener al menos 3 caracteres").max(400),
  incurredOn: z
    .string()
    .refine((value) => isValidIsoDate(value), { message: "La fecha no es válida" })
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    }, { message: "La fecha no puede ser futura" }),
});
