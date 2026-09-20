import { z } from "zod";
import { PAYMENT_METHODS } from "@hogarplus/shared";

export const createPaymentSchema = z.object({
  clientId: z.string().min(1),
  creditId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(5),
});
