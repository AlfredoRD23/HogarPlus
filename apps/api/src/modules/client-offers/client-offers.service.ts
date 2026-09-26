import type { Prisma } from "@prisma/client";
import { activeOffer, CATALOG_TIER_LABELS, effectivePrice, productRequestAccess, type ActiveOffer } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import { portalUrl, sendClientTemplate } from "../../shared/mailer";
import { offerEmailVars } from "../../shared/promo-mail";
import type { CreateClientOfferInput } from "./client-offers.schema";

type OfferRow = {
  offerType: "DISCOUNT" | "GIFT" | "PROMO";
  offerDiscount: number | null;
  offerLabel: string | null;
  offerEndsAt: Date | null;
};

/** Oferta exclusiva evaluada sobre el precio del producto; null si ya venció. */
export function exclusiveOffer(row: OfferRow, price: number, now: Date = new Date()): ActiveOffer | null {
  return activeOffer({ price, ...row }, now);
}

function endOfDay(value: string | null | undefined) {
  if (!value) return null;
  // Fin del día en hora de República Dominicana (UTC-4, sin horario de verano).
  return new Date(`${value.slice(0, 10)}T23:59:59-04:00`);
}

const listInclude = {
  client: { select: { id: true, code: true, firstName: true, lastName: true, email: true, level: true } },
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      catalogTier: true,
      imageUrl: true,
      images: { take: 1, orderBy: { createdAt: "asc" as const }, select: { path: true } },
    },
  },
} satisfies Prisma.ClientOfferInclude;

export class ClientOffersService {
  async list(query: { clientId?: string; productId?: string; status?: string }) {
    const status = query.status === "ALL" ? undefined : ((query.status as "ACTIVE" | "USED" | "CANCELLED" | undefined) ?? "ACTIVE");
    const items = await prisma.clientOffer.findMany({
      where: {
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: listInclude,
    });
    const now = new Date();
    return items.map((item) => {
      const offer = exclusiveOffer(item, Number(item.product.price), now);
      return {
        ...item,
        expired: item.status === "ACTIVE" && !offer,
        offer,
        product: { ...item.product, imageUrl: item.product.imageUrl || item.product.images[0]?.path || null },
      };
    });
  }

  async create(input: CreateClientOfferInput, actorId: string, ip?: string) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.status !== "ACTIVE") throw new AppError(404, "NOT_FOUND", "Producto no disponible");

    const price = Number(product.price);
    if (input.offerType === "DISCOUNT" && input.offerDiscount) {
      const finalPrice = effectivePrice({ price, offerType: "DISCOUNT", offerDiscount: input.offerDiscount });
      if (finalPrice <= Number(product.cost)) {
        throw new AppError(400, "INVALID_OFFER", "Con ese descuento el precio queda por debajo del costo");
      }
    }

    const clientIds = [...new Set(input.clientIds)];
    const found = await prisma.client.findMany({
      where: { id: { in: clientIds }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, email: true, level: true, catalogApproved: true },
    });
    // Solo clientes que pueden llevarse ese producto por su categoría.
    const clients = found.filter(
      (client) => productRequestAccess(client.level, product.catalogTier, client.catalogApproved).canRequest,
    );
    if (clients.length === 0) {
      throw new AppError(
        400,
        "NO_CLIENTS",
        found.length === 0
          ? "Ninguno de los clientes elegidos está activo"
          : `Ninguno de los clientes elegidos puede pedir productos ${CATALOG_TIER_LABELS[product.catalogTier]} por su categoría`,
      );
    }

    const data = {
      productId: product.id,
      offerType: input.offerType,
      offerDiscount: input.offerType === "DISCOUNT" ? input.offerDiscount ?? null : null,
      offerLabel: input.offerLabel?.trim() || null,
      offerEndsAt: endOfDay(input.offerEndsAt),
      createdById: actorId,
    };

    // Una sola oferta activa por cliente y producto: la nueva reemplaza a la anterior.
    await prisma.$transaction([
      prisma.clientOffer.updateMany({
        where: { productId: product.id, clientId: { in: clients.map((c) => c.id) }, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      }),
      prisma.clientOffer.createMany({ data: clients.map((client) => ({ ...data, clientId: client.id })) }),
    ]);

    await writeAudit({
      userId: actorId,
      action: "CREATE",
      entity: "ClientOffer",
      entityId: product.id,
      after: { ...data, clientIds: clients.map((c) => c.id) },
      ip,
    });

    const offer = exclusiveOffer(data, price);
    let notified = 0;
    if (input.notify && offer) {
      const vars = offerEmailVars(offer);
      const url = portalUrl();
      const withEmail = clients.filter((client) => client.email);
      notified = withEmail.length;
      void (async () => {
        for (const client of withEmail) {
          await sendClientTemplate(client.email, "exclusive_offer", {
            clientName: `${client.firstName} ${client.lastName}`,
            productName: product.name,
            portalUrl: url,
            ...vars,
          });
        }
      })().catch((error) => console.error("No se pudo enviar la oferta exclusiva", error));
    }

    return {
      created: clients.length,
      skipped: clientIds.length - clients.length,
      notified,
    };
  }

  async cancel(id: string, actorId: string, ip?: string) {
    const existing = await prisma.clientOffer.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Oferta no encontrada");
    if (existing.status !== "ACTIVE") throw new AppError(400, "NOT_ACTIVE", "Esta oferta ya no está activa");
    const data = await prisma.clientOffer.update({ where: { id }, data: { status: "CANCELLED" } });
    await writeAudit({ userId: actorId, action: "CANCEL", entity: "ClientOffer", entityId: id, before: existing, after: data, ip });
    return data;
  }

  /** Oferta exclusiva vigente de un cliente para un producto (la más reciente). */
  async activeFor(clientId: string, productId: string, price: number) {
    const rows = await prisma.clientOffer.findMany({
      where: { clientId, productId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    for (const row of rows) {
      const offer = exclusiveOffer(row, price);
      if (offer) return { row, offer };
    }
    return null;
  }
}

export const clientOffersService = new ClientOffersService();
