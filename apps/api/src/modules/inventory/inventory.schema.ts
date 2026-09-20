import { z } from "zod";
import { INVENTORY_MOVEMENT_TYPES } from "@hogarplus/shared";

export const movementSchema = z
  .object({
    productId: z.string().min(1, "Selecciona un producto"),
    type: z.enum(INVENTORY_MOVEMENT_TYPES),
    quantity: z.coerce.number().int("La cantidad debe ser entera").min(0, "La cantidad no puede ser negativa"),
    unitCost: z.number().nonnegative().max(9_999_999.99).optional(),
    reason: z.string().trim().min(2, "El motivo debe tener al menos 2 caracteres").max(160),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "ADJUSTMENT" && data.quantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "La cantidad debe ser mayor que 0",
      });
    }
  });
