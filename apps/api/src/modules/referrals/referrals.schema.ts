import { z } from "zod";
import { digitsOnly, isValidPhoneRD, personNameError } from "@hogarplus/shared";

export const createReferralSchema = z.object({
  firstName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "nombre"), {
      message: "El nombre del referido solo puede incluir letras y debe tener al menos 2 caracteres",
    }),
  lastName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => !personNameError(value, "apellido"), {
      message: "El apellido del referido solo puede incluir letras y debe tener al menos 2 caracteres",
    }),
  phone: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => isValidPhoneRD(value), {
      message: "El teléfono del referido debe tener 10 dígitos y iniciar con 809, 829 o 849",
    }),
});
