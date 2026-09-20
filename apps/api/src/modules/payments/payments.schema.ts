import { z } from "zod";
import { PAYMENT_METHODS } from "@hogarplus/shared";

export const createPaymentSchema = z
  .object({
    clientId: z.string().min(1, "Selecciona un cliente"),
    creditId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((value) => value || undefined),
    amount: z.coerce.number().positive("El monto debe ser mayor que 0").max(9_999_999.99, "El monto es demasiado alto"),
    method: z.enum(PAYMENT_METHODS),
    reference: z
      .string()
      .optional()
      .transform((value) => value?.trim().toUpperCase() || undefined)
      .refine((value) => !value || /^[A-Z0-9-]{4,30}$/.test(value), {
        message: "La referencia solo puede tener letras, números y guion",
      }),
    notes: z.string().max(400).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.method === "TRANSFER" || data.method === "DEPOSIT") && !data.reference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reference"],
        message: "La referencia es obligatoria para transferencia o depósito",
      });
    }
  });

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres").max(400),
});
