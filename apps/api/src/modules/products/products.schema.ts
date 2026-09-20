import { z } from "zod";
import { CATALOG_TIERS, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@hogarplus/shared";

const money = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} no es válido` })
    .positive(`El ${label} debe ser mayor que 0`)
    .max(9_999_999.99, `El ${label} es demasiado alto`);

export const createProductSchema = z.object({
  sku: z.string().min(2).max(30).optional(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre del producto debe tener al menos 2 caracteres")
    .refine((value) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value), { message: "El nombre del producto debe incluir letras" }),
  description: z.string().max(400).optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  catalogTier: z.enum(CATALOG_TIERS),
  cost: money("costo"),
  price: money("precio"),
  stock: z.coerce.number().int("El stock debe ser entero").min(0, "El stock no puede ser negativo").default(0),
  minStock: z.coerce.number().int().min(0).default(2),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
});
