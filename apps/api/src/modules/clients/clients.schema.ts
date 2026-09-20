import { z } from "zod";
import { CLIENT_STATUSES } from "@hogarplus/shared";

export const createClientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  documentId: z.string().min(5),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  referredById: z.string().optional(),
  notes: z.string().optional(),
  payAffiliation: z.boolean().optional(),
  affiliationMethod: z.enum(["CASH", "TRANSFER", "DEPOSIT"]).optional(),
});

export const updateClientSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  catalogApproved: z.boolean().optional(),
  notes: z.string().optional(),
});
