import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, nextCode, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { z } from "zod";
import type { createProductSchema, updateProductSchema } from "./products.schema";

export class ProductsService {
  async list(query: {
    page?: unknown;
    pageSize?: unknown;
    search?: string;
    category?: string;
    catalogTier?: string;
    status?: string;
  }) {
    const { skip, take, page, pageSize } = pagination(query);
    const where: Prisma.ProductWhereInput = {
      ...(query.category ? { category: query.category as Prisma.EnumProductCategoryFilter["equals"] } : {}),
      ...(query.catalogTier ? { catalogTier: query.catalogTier as Prisma.EnumCatalogTierFilter["equals"] } : {}),
      ...(query.status ? { status: query.status as Prisma.EnumProductStatusFilter["equals"] } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }] }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: { _count: { select: { credits: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventoryMovements: { orderBy: { createdAt: "desc" }, take: 30 } },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    return product;
  }

  async create(input: z.infer<typeof createProductSchema>, actorId: string, ip?: string) {
    if (input.price <= input.cost) {
      throw new AppError(400, "INVALID_PRICE", "El precio de venta debe ser mayor al costo");
    }

    const sku = input.sku || (await nextCode("product", "HP"));
    const product = await prisma.product.create({
      data: {
        sku,
        name: input.name,
        description: input.description,
        category: input.category,
        catalogTier: input.catalogTier,
        cost: input.cost,
        price: input.price,
        stock: input.stock,
        minStock: input.minStock,
      },
    });

    if (input.stock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: input.stock,
          unitCost: input.cost,
          reason: "Stock inicial",
          userId: actorId,
        },
      });
    }

    await writeAudit({ userId: actorId, action: "CREATE", entity: "Product", entityId: product.id, after: product, ip });
    return product;
  }

  async update(id: string, input: z.infer<typeof updateProductSchema>, actorId: string, ip?: string) {
    const before = await prisma.product.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category,
        catalogTier: input.catalogTier,
        cost: input.cost,
        price: input.price,
        minStock: input.minStock,
        status: input.status,
      },
    });

    await writeAudit({ userId: actorId, action: "UPDATE", entity: "Product", entityId: id, before, after: product, ip });
    return product;
  }
}

export const productsService = new ProductsService();
