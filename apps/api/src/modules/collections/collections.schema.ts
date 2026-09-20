import { z } from "zod";

export const noteSchema = z.object({
  clientId: z.string().min(1),
  creditId: z.string().optional(),
  channel: z.enum(["CALL", "WHATSAPP", "VISIT", "SMS", "OTHER"]).default("WHATSAPP"),
  note: z.string().min(3),
  nextFollowUp: z.string().optional(),
});
