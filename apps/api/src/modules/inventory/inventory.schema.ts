import { z } from "zod";
import { INVENTORY_MOVEMENT_TYPES } from "@hogarplus/shared";

export const movementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(INVENTORY_MOVEMENT_TYPES),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative().optional(),
  reason: z.string().min(2),
});
