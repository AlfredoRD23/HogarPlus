import { z } from "zod";

export const noteSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  creditId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  channel: z.enum(["CALL", "WHATSAPP", "VISIT", "SMS", "OTHER"]).default("WHATSAPP"),
  note: z.string().trim().min(3, "La nota debe tener al menos 3 caracteres").max(400),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida").optional(),
});
