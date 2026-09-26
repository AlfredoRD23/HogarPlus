import { z } from "zod";
import { CATALOG_TIERS, OFFER_TYPES, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@hogarplus/shared";

const money = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `El ${label} no es válido` })
    .positive(`El ${label} debe ser mayor que 0`)
    .max(9_999_999.99, `El ${label} es demasiado alto`);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "La fecha no es válida")
  .nullable()
  .optional();

const productFields = z.object({
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
  offerType: z.enum(OFFER_TYPES).nullable().optional(),
  offerDiscount: z.coerce
    .number()
    .int("El descuento debe ser entero")
    .min(1, "El descuento debe ser al menos 1%")
    .max(90, "El descuento no puede pasar de 90%")
    .nullable()
    .optional(),
  offerLabel: z.string().trim().max(120, "El texto de la oferta es muy largo").nullable().optional(),
  offerEndsAt: isoDate,
  newUntil: isoDate,
});

type OfferInput = Partial<z.infer<typeof productFields>>;

function checkOffer(value: OfferInput, ctx: z.RefinementCtx) {
  if (value.offerType === "DISCOUNT" && !value.offerDiscount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["offerDiscount"], message: "Indica el % de descuento" });
  }
  if (value.offerType === "GIFT" && !value.offerLabel?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["offerLabel"], message: "Indica qué regalo incluye" });
  }
  if (value.offerType === "PROMO" && !value.offerLabel?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["offerLabel"], message: "Escribe el texto de la promoción" });
  }
}

export const createProductSchema = productFields.superRefine(checkOffer);

export const updateProductSchema = productFields
  .partial()
  .extend({ status: z.enum(PRODUCT_STATUSES).optional() })
  .superRefine(checkOffer);
