import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { z } from "zod";
import type { movementSchema } from "./inventory.schema";

export class InventoryService {
  async list(query: { page?: unknown; pageSize?: unknown; productId?: string; type?: string }) {
    const { skip, take, page, pageSize } = pagination(query);
    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type as Prisma.EnumInventoryMovementTypeFilter["equals"] } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { sku: true, name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    const summary = await prisma.product.findMany({
      select: { id: true, sku: true, name: true, stock: true, minStock: true, cost: true, category: true },
      orderBy: { name: "asc" },
    });

    return { items, summary, meta: { page, pageSize, total } };
  }

  async move(input: z.infer<typeof movementSchema>, actorId: string, ip?: string) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");

    const nextStock =
      input.type === "ADJUSTMENT" ? input.quantity : product.stock + (input.type === "IN" ? input.quantity : -input.quantity);

    if (nextStock < 0) {
      throw new AppError(400, "NO_STOCK", "No hay inventario suficiente");
    }

    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMovement.create({
        data: {
          productId: input.productId,
          type: input.type,
          quantity: input.type === "ADJUSTMENT" ? nextStock - product.stock : input.quantity,
          unitCost: input.unitCost ?? product.cost,
          reason: input.reason,
          userId: actorId,
        },
      });

      await tx.product.update({ where: { id: product.id }, data: { stock: nextStock } });
      return created;
    });

    await writeAudit({
      userId: actorId,
      action: "INVENTORY_MOVE",
      entity: "Product",
      entityId: product.id,
      before: { stock: product.stock },
      after: { stock: nextStock, type: input.type },
      ip,
    });

    return movement;
  }
}

export const inventoryService = new InventoryService();
