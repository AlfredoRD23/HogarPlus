import { z } from "zod";
import { isValidEmail } from "@hogarplus/shared";

export const loginSchema = z.object({
  email: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => isValidEmail(value), { message: "El correo no tiene un formato válido" }),
  password: z.string().min(6, "La contraseña es obligatoria"),
});
