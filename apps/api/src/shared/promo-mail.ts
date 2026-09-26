import { activeOffer, catalogsForLevel, isNewProduct, type ActiveOffer } from "@hogarplus/shared";
import { prisma } from "../lib/prisma";
import { portalUrl, sendClientTemplate, type ClientEmailVars } from "./mailer";

export function formatRd(value: number) {
  return `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function offerEmailVars(offer: ActiveOffer): Partial<ClientEmailVars> {
  const discounted = offer.type === "DISCOUNT" && offer.finalPrice < offer.basePrice;
  return {
    offer: offer.type === "DISCOUNT" ? `${offer.headline} de descuento` : offer.type === "GIFT" ? "Regalo gratis" : "Promoción",
    offerDetail: offer.detail ?? undefined,
    amount: formatRd(offer.finalPrice),
    previousAmount: discounted ? formatRd(offer.basePrice) : undefined,
    endsAt: offer.endsAt ? formatDay(offer.endsAt) : undefined,
  };
}

export type CatalogNewsKind = "offer" | "new";

/**
 * Avisa por correo a los clientes activos con correo que pueden pedir ese producto.
 * Se envía uno por uno para no exponer los correos entre clientes.
 */
export async function notifyCatalogNews(productId: string, kind: CatalogNewsKind): Promise<number> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE") return 0;
  const fields = { ...product, price: Number(product.price) };
  const offer = activeOffer(fields);
  if (kind === "offer" && !offer) return 0;
  if (kind === "new" && !isNewProduct(fields)) return 0;

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE", email: { not: null } },
    select: { firstName: true, lastName: true, email: true, level: true },
  });
  const url = portalUrl();
  let sent = 0;
  for (const client of clients) {
    if (!client.email || !catalogsForLevel(client.level).includes(product.catalogTier)) continue;
    const vars: ClientEmailVars = {
      clientName: `${client.firstName} ${client.lastName}`,
      productName: product.name,
      portalUrl: url,
      ...(kind === "offer" && offer ? offerEmailVars(offer) : { amount: formatRd(Number(product.price)) }),
    };
    if (await sendClientTemplate(client.email, kind === "offer" ? "catalog_offer" : "catalog_new", vars)) sent += 1;
  }
  return sent;
}

export function notifyCatalogNewsInBackground(productId: string, kind: CatalogNewsKind) {
  notifyCatalogNews(productId, kind)
    .then((sent) => {
      if (sent > 0) console.log(`[correo] aviso de ${kind === "offer" ? "oferta" : "producto nuevo"} enviado a ${sent} clientes`);
    })
    .catch((error) => console.error("No se pudo enviar el aviso del catálogo", error));
}
