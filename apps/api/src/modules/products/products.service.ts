import { Prisma } from "@prisma/client";
import fs from "fs";
import { prisma } from "../../lib/prisma";
import { AppError, nextCode, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import { absoluteUploadPath, MAX_PRODUCT_IMAGES, publicUploadPathFor } from "../../lib/upload";
import type { z } from "zod";
import { activeOffer, effectivePrice, isNewProduct, type OfferType } from "@hogarplus/shared";
import { notifyCatalogNewsInBackground } from "../../shared/promo-mail";
import type { createProductSchema, updateProductSchema } from "./products.schema";

const productImages = {
  images: { orderBy: { createdAt: "asc" as const }, select: { id: true, path: true, originalName: true } },
};

export const promoSelect = {
  offerType: true,
  offerDiscount: true,
  offerLabel: true,
  offerEndsAt: true,
  newUntil: true,
} as const;

type PromoRow = {
  price: Prisma.Decimal | number;
  offerType: OfferType | null;
  offerDiscount: number | null;
  offerLabel: string | null;
  offerEndsAt: Date | null;
  newUntil: Date | null;
};

/** Campos de oferta listos para catálogo público y portal. */
export function publicPromo(row: PromoRow) {
  const fields = { ...row, price: Number(row.price) };
  const offer = activeOffer(fields);
  return {
    offer,
    isNew: isNewProduct(fields),
    finalPrice: offer?.finalPrice ?? Number(row.price),
  };
}

function endOfDay(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  // Fin del día en hora de República Dominicana (UTC-4, sin horario de verano).
  return new Date(`${value.slice(0, 10)}T23:59:59-04:00`);
}

type PromoInput = {
  offerType?: OfferType | null;
  offerDiscount?: number | null;
  offerLabel?: string | null;
  offerEndsAt?: string | null;
  newUntil?: string | null;
};

function promoData(input: PromoInput) {
  if (input.offerType === undefined) {
    return { newUntil: endOfDay(input.newUntil) };
  }
  const type = input.offerType;
  return {
    offerType: type,
    offerDiscount: type === "DISCOUNT" ? input.offerDiscount ?? null : null,
    offerLabel: type ? input.offerLabel?.trim() || null : null,
    offerEndsAt: type ? endOfDay(input.offerEndsAt) ?? null : null,
    newUntil: endOfDay(input.newUntil),
  };
}

type PromoSnapshot = PromoRow & { status: string };

function offerKey(row: PromoSnapshot) {
  const offer = activeOffer({ ...row, price: Number(row.price) });
  return offer ? `${offer.type}|${offer.discount}|${offer.detail ?? ""}` : null;
}

/** Decide si hay que avisar a los clientes por una oferta nueva o un producto nuevo. */
function announceChanges(before: PromoSnapshot | null, after: PromoSnapshot & { id: string }) {
  if (after.status !== "ACTIVE") return;
  const wasVisible = before?.status === "ACTIVE";
  const afterOffer = offerKey(after);
  if (afterOffer && (!wasVisible || !before || offerKey(before) !== afterOffer)) {
    notifyCatalogNewsInBackground(after.id, "offer");
    return;
  }
  const isNew = isNewProduct(after);
  if (isNew && (!wasVisible || !before || !isNewProduct(before))) {
    notifyCatalogNewsInBackground(after.id, "new");
  }
}

function assertOfferAboveCost(price: number, cost: number, input: PromoInput) {
  if (input.offerType !== "DISCOUNT" || !input.offerDiscount) return;
  const finalPrice = effectivePrice({ price, offerType: "DISCOUNT", offerDiscount: input.offerDiscount });
  if (finalPrice <= cost) {
    throw new AppError(400, "INVALID_OFFER", "Con ese descuento el precio queda por debajo del costo");
  }
}

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
        include: { _count: { select: { credits: true } }, ...productImages },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async listPublic() {
    const items = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        catalogTier: true,
        price: true,
        imageUrl: true,
        ...promoSelect,
        images: { take: 1, orderBy: { createdAt: "asc" }, select: { path: true } },
      },
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      catalogTier: item.catalogTier,
      price: item.price,
      imageUrl: item.imageUrl || item.images[0]?.path || null,
      ...publicPromo(item),
    }));
  }

  async get(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventoryMovements: { orderBy: { createdAt: "desc" }, take: 30 }, ...productImages },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    return product;
  }

  async create(input: z.infer<typeof createProductSchema>, actorId: string, ip?: string) {
    if (input.price <= input.cost) {
      throw new AppError(400, "INVALID_PRICE", "El precio de venta debe ser mayor al costo");
    }
    assertOfferAboveCost(input.price, input.cost, input);

    const name = input.name.trim();
    const duplicate = await prisma.product.findFirst({
      where: { name, status: "ACTIVE" },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(409, "DUPLICATE", "Ese producto ya está en el catálogo. Edítalo, no lo vuelvas a guardar.");
    }

    const sku = input.sku || (await nextCode("product", "HP"));
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: input.description,
        category: input.category,
        catalogTier: input.catalogTier,
        cost: input.cost,
        price: input.price,
        stock: input.stock,
        minStock: input.minStock,
        ...promoData(input),
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
    announceChanges(null, product);
    return product;
  }

  async update(id: string, input: z.infer<typeof updateProductSchema>, actorId: string, ip?: string) {
    const before = await prisma.product.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    assertOfferAboveCost(input.price ?? Number(before.price), input.cost ?? Number(before.cost), input);

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
        ...promoData(input),
      },
    });

    await writeAudit({ userId: actorId, action: "UPDATE", entity: "Product", entityId: id, before, after: product, ip });
    announceChanges(before, product);
    return prisma.product.findUniqueOrThrow({ where: { id }, include: { _count: { select: { credits: true } }, ...productImages } });
  }

  async addImages(productId: string, files: Express.Multer.File[]) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { images: true } } },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    if (product._count.images + files.length > MAX_PRODUCT_IMAGES) {
      throw new AppError(400, "TOO_MANY_FILES", `Este producto ya tiene el máximo de ${MAX_PRODUCT_IMAGES} fotos`);
    }

    await prisma.productImage.createMany({
      data: files.map((file) => ({
        productId,
        path: publicUploadPathFor("products", productId, file.filename),
        originalName: file.originalname,
      })),
    });
    await this.syncCover(productId);
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
  }

  async remove(id: string, actorId: string, ip?: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        _count: { select: { credits: true } },
      },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    if (product._count.credits > 0) {
      throw new AppError(409, "IN_USE", "Este producto ya se entregó. Desactívalo; no se puede borrar.");
    }

    for (const image of product.images) {
      const diskPath = absoluteUploadPath(image.path);
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    }

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.inventoryMovement.deleteMany({ where: { productId: id } }),
      prisma.productRequest.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    await writeAudit({ userId: actorId, action: "DELETE", entity: "Product", entityId: id, before: product, ip });
    return { id };
  }

  async removeImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new AppError(404, "NOT_FOUND", "Imagen no encontrada");
    const diskPath = absoluteUploadPath(image.path);
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    await prisma.productImage.delete({ where: { id: imageId } });
    await this.syncCover(productId);
    return { id: imageId };
  }

  private async syncCover(productId: string) {
    const first = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: first?.path ?? null },
    });
  }
}

export const productsService = new ProductsService();
