import { z } from "zod";
import { CLIENT_STATUSES, cityError, digitsOnly, isValidCedula, isValidEmail, isValidPhoneRD, locationUrlError, personNameError } from "@hogarplus/shared";

export const createClientSchema = z.object({
  firstName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "nombre"), { message: "El nombre solo puede incluir letras y debe tener al menos 2 caracteres" }),
  lastName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "apellido"), { message: "El apellido solo puede incluir letras y debe tener al menos 2 caracteres" }),
  documentId: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => isValidCedula(value), { message: "La cédula debe ser válida (000-0000000-0)" }),
  phone: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => isValidPhoneRD(value), { message: "El teléfono debe tener 10 dígitos y iniciar con 809, 829 o 849" }),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.trim().toLowerCase() : undefined))
    .refine((value) => !value || isValidEmail(value), { message: "Correo inválido" }),
  address: z.string().max(160).optional(),
  city: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !cityError(value), { message: "La ciudad es obligatoria y solo puede incluir letras" }),
  province: z.string().trim().max(50).optional(),
  referredById: z.string().min(1).optional().or(z.literal("")).transform((value) => value || undefined),
  notes: z.string().max(400).optional(),
  referenceName: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.trim() : undefined))
    .refine((value) => !value || !personNameError(value, "nombre de la referencia"), {
      message: "El nombre de la referencia solo puede incluir letras",
    }),
  referencePhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? digitsOnly(value) : undefined))
    .refine((value) => !value || isValidPhoneRD(value), {
      message: "El teléfono de la referencia debe iniciar con 809, 829 o 849",
    }),
  locationUrl: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value.trim() : undefined))
    .refine((value) => !value || !locationUrlError(value), { message: "Pega un link válido de Google Maps o ubicación" }),
  routeId: z.string().min(1).optional().or(z.literal("")).transform((value) => value || undefined),
  payAffiliation: z.boolean().optional().default(true),
  affiliationMethod: z.enum(["CASH", "TRANSFER", "DEPOSIT"]).optional(),
  productId: z.string().min(1, "Selecciona un producto Bronce para entregar"),
}).superRefine((data, ctx) => {
  if (data.payAffiliation === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payAffiliation"],
      message: "Hay que cobrar la afiliación al entregar el producto",
    });
  }
  if (Boolean(data.referenceName) !== Boolean(data.referencePhone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: data.referenceName ? ["referencePhone"] : ["referenceName"],
      message: "La referencia necesita nombre y teléfono",
    });
  }
});

export const updateClientSchema = z.object({
  firstName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "nombre"), { message: "El nombre solo puede incluir letras" })
    .optional(),
  lastName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "apellido"), { message: "El apellido solo puede incluir letras" })
    .optional(),
  phone: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => isValidPhoneRD(value), { message: "El teléfono debe iniciar con 809, 829 o 849" })
    .optional(),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim().toLowerCase();
      return trimmed || null;
    })
    .refine((value) => value === undefined || value === null || isValidEmail(value), { message: "Correo inválido" }),
  address: z.string().max(160).optional(),
  city: z.string().trim().max(50).optional(),
  province: z.string().trim().max(50).optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  catalogApproved: z.boolean().optional(),
  notes: z.string().max(400).optional(),
  referenceName: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (value === undefined) return undefined;
      return value.trim() || null;
    })
    .refine((value) => value === undefined || value === null || !personNameError(value, "nombre de la referencia"), {
      message: "El nombre de la referencia solo puede incluir letras",
    }),
  referencePhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (value === undefined) return undefined;
      const digits = digitsOnly(value);
      return digits || null;
    })
    .refine((value) => value === undefined || value === null || isValidPhoneRD(value), {
      message: "El teléfono de la referencia debe iniciar con 809, 829 o 849",
    }),
  locationUrl: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed || null;
    })
    .refine((value) => value === undefined || value === null || !locationUrlError(value), {
      message: "Pega un link válido de Google Maps o ubicación",
    }),
  routeId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (value === undefined) return undefined;
      return value.trim() || null;
    }),
}).superRefine((data, ctx) => {
  const hasName = Boolean(data.referenceName);
  const hasPhone = Boolean(data.referencePhone);
  if (data.referenceName !== undefined && data.referencePhone !== undefined && hasName !== hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasName ? ["referencePhone"] : ["referenceName"],
      message: "La referencia necesita nombre y teléfono",
    });
  }
});
