import { z } from "zod";
import { OFFER_TYPES } from "@hogarplus/shared";

export const createClientOfferSchema = z
  .object({
    clientIds: z
      .array(z.string().min(1))
      .min(1, "Elige al menos un cliente")
      .max(300, "Máximo 300 clientes por vez"),
    productId: z.string().min(1, "Elige un producto"),
    offerType: z.enum(OFFER_TYPES),
    offerDiscount: z.coerce
      .number()
      .int("El descuento debe ser entero")
      .min(1, "El descuento debe ser al menos 1%")
      .max(90, "El descuento no puede pasar de 90%")
      .nullable()
      .optional(),
    offerLabel: z.string().trim().max(120, "El texto de la oferta es muy largo").nullable().optional(),
    offerEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "La fecha no es válida").nullable().optional(),
    notify: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.offerType === "DISCOUNT" && !value.offerDiscount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["offerDiscount"], message: "Indica el % de descuento" });
    }
    if (value.offerType !== "DISCOUNT" && !value.offerLabel?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offerLabel"],
        message: value.offerType === "GIFT" ? "Indica qué regalo incluye" : "Escribe el texto de la promoción",
      });
    }
  });

export type CreateClientOfferInput = z.infer<typeof createClientOfferSchema>;
