import { z } from "zod";
import { PAYMENT_FREQUENCIES } from "@hogarplus/shared";

export const createCreditSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  productId: z.string().min(1, "Selecciona un producto"),
  weeklyQuota: z.coerce.number().positive("La cuota debe ser mayor que 0").max(9_999_999.99).optional(),
  weeks: z.coerce.number().int().min(1, "Debe haber al menos 1 cuota").max(104, "El plazo máximo es 104 cuotas").optional(),
  downPayment: z.coerce.number().min(0, "El pago inicial no puede ser negativo").max(9_999_999.99).optional(),
  frequency: z.enum(PAYMENT_FREQUENCIES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida").optional(),
  notes: z.string().max(400).optional(),
});

export const updateCreditSchema = z.object({
  weeklyQuota: z.coerce.number().positive("La cuota debe ser mayor que 0").max(9_999_999.99).optional(),
  weeks: z.coerce.number().int().min(1, "Debe haber al menos 1 cuota").max(104, "El plazo máximo es 104 cuotas").optional(),
  downPayment: z.coerce.number().min(0, "El pago inicial no puede ser negativo").max(9_999_999.99).optional(),
  frequency: z.enum(PAYMENT_FREQUENCIES).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida").optional(),
  notes: z.string().max(400).optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
});
