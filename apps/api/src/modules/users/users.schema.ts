import { z } from "zod";
import { ROLES, digitsOnly, isValidEmail, isValidPhoneRD, personNameError } from "@hogarplus/shared";

export const createUserSchema = z.object({
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => isValidEmail(value), { message: "El correo no tiene un formato válido" }),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña es demasiado larga")
    .refine((value) => !/\s/.test(value), { message: "La contraseña no puede tener espacios" }),
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "nombre"), { message: "El nombre solo puede incluir letras" }),
  phone: z
    .string()
    .optional()
    .transform((value) => (value ? digitsOnly(value) : undefined))
    .refine((value) => !value || isValidPhoneRD(value), { message: "El teléfono debe iniciar con 809, 829 o 849" }),
  role: z.enum(ROLES),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "nombre"), { message: "El nombre solo puede incluir letras" })
    .optional(),
  phone: z
    .string()
    .optional()
    .transform((value) => (value ? digitsOnly(value) : undefined))
    .refine((value) => !value || isValidPhoneRD(value), { message: "El teléfono debe iniciar con 809, 829 o 849" }),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72)
    .refine((value) => !/\s/.test(value), { message: "La contraseña no puede tener espacios" })
    .optional(),
});
