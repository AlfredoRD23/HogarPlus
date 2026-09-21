import { z } from "zod";
import { PAYMENT_METHODS } from "@hogarplus/shared";

export const createPaymentSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  creditId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  amount: z.coerce.number().positive("El monto debe ser mayor que 0").max(9_999_999.99, "El monto es demasiado alto"),
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().max(400).optional(),
  receiptPath: z.string().max(500).optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(400),
});
