import { z } from "zod";
import { CATALOG_TIERS, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from "@hogarplus/shared";

export const createProductSchema = z.object({
  sku: z.string().min(2).optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  catalogTier: z.enum(CATALOG_TIERS),
  cost: z.number().positive(),
  price: z.number().positive(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(2),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
});
