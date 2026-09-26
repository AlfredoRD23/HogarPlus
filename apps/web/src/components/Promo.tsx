import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Clock, Crown, Gift, Package, Percent, Sparkles, Tag } from "lucide-react";
import type { ActiveOffer, CatalogTier, OfferType } from "@hogarplus/shared";
import { mediaUrl, money } from "../lib/api";
import { CatalogBadge } from "./Badges";

export type PromoInfo = {
  offer: ActiveOffer | null;
  isNew: boolean;
  finalPrice: number;
  /** Oferta exclusiva del cliente (solo en el portal). */
  exclusive?: ActiveOffer | null;
};

function offerIcon(type: OfferType) {
  switch (type) {
    case "DISCOUNT":
      return Percent;
    case "GIFT":
      return Gift;
    case "PROMO":
      return Tag;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function OfferRibbon({ offer }: { offer: ActiveOffer }) {
  const Icon = offerIcon(offer.type);
  return (
    <span className="promo-ribbon">
      <Icon size={13} strokeWidth={2.5} />
      {offer.type === "DISCOUNT" ? offer.headline : offer.type === "GIFT" ? "Regalo" : "Promo"}
    </span>
  );
}

export function ExclusiveBadge() {
  return (
    <span className="promo-exclusive">
      <Crown size={12} strokeWidth={2.5} />
      Solo para ti
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="promo-new">
      <Sparkles size={12} strokeWidth={2.5} />
      Nuevo
    </span>
  );
}

/** Insignias de oferta y novedad para la esquina de la foto. */
export function PromoBadges({ promo }: { promo: PromoInfo }) {
  if (!promo.offer && !promo.isNew && !promo.exclusive) return null;
  return (
    <div className="flex flex-col items-end gap-1.5">
      {promo.exclusive ? <ExclusiveBadge /> : null}
      {promo.offer ? <OfferRibbon offer={promo.offer} /> : null}
      {promo.isNew ? <NewBadge /> : null}
    </div>
  );
}

export function OfferPrice({
  price,
  promo,
  dark,
  size = "md",
}: {
  price: number;
  promo: PromoInfo;
  dark?: boolean;
  size?: "md" | "lg";
}) {
  const discounted = promo.offer?.type === "DISCOUNT" && promo.finalPrice < Number(price);
  const main = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <div className="min-w-0">
      {discounted ? (
        <p className="text-xs text-slate-400 line-through">{money(price)}</p>
      ) : null}
      <p className={`font-display ${main} ${discounted ? "text-gold-500" : dark ? "text-white" : "text-navy-900"}`}>
        {money(discounted ? promo.finalPrice : price)}
      </p>
    </div>
  );
}

/** Línea con el detalle de la oferta: regalo, promo o nota del descuento. */
export function OfferDetail({ offer, dark }: { offer: ActiveOffer; dark?: boolean }) {
  if (!offer.detail) return null;
  const Icon = offerIcon(offer.type);
  return (
    <p
      className={`promo-detail mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
        dark ? "bg-gold-500/15 text-gold-300" : "bg-gold-50 text-gold-600"
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">
        {offer.type === "GIFT" ? `Gratis: ${offer.detail}` : offer.detail}
      </span>
    </p>
  );
}

export type ShowcaseProduct = PromoInfo & {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  catalogTier: CatalogTier;
  price: number;
};

/** Tarjeta oscura del catálogo público y del portal, con oferta animada. */
export function ShowcaseCard({
  product,
  eyebrow,
  action,
  className = "",
  delay = 0,
}: {
  product: ShowcaseProduct;
  eyebrow?: string;
  action: ReactNode;
  className?: string;
  delay?: number;
}) {
  const style: CSSProperties = { animationDelay: `${delay}ms` };
  return (
    <article
      style={style}
      className={`promo-enter group flex h-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl text-white ${
        product.exclusive
          ? "promo-card-exclusive shadow-[0_18px_50px_-20px_rgba(124,58,237,0.6)]"
          : product.offer
            ? "promo-card shadow-[0_18px_50px_-20px_rgba(196,160,74,0.55)]"
            : "portal-card"
      } ${className}`}
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#223b5e]">
        {product.imageUrl ? (
          <img
            src={mediaUrl(product.imageUrl)}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <Package size={30} />
            <span className="text-xs font-medium">Sin foto</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1b3150] to-transparent" />
        <div className="absolute left-3 top-3">
          <CatalogBadge tier={product.catalogTier} />
        </div>
        <div className="absolute right-3 top-3">
          <PromoBadges promo={product} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
        {eyebrow ? <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{eyebrow}</p> : null}
        <h4 className="mt-1 line-clamp-1 text-[1.05rem] font-semibold tracking-tight">{product.name}</h4>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-300">
          {product.description || "Disponible a crédito con cuotas semanales."}
        </p>
        {product.offer ? <OfferDetail offer={product.offer} dark /> : null}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div className="min-w-0">
            <OfferPrice price={product.price} promo={product} dark />
            {product.offer ? <OfferCountdown endsAt={product.offer.endsAt} dark /> : null}
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}

/** Ofertas primero (descuento mayor arriba), luego los nuevos. */
export function promoRank<T extends PromoInfo>(items: T[]): T[] {
  return items
    .filter((item) => item.offer || item.isNew)
    .sort((a, b) => {
      const score = (item: T) => (item.offer ? 1000 + (item.offer.discount || 1) : 0) + (item.isNew ? 1 : 0);
      return score(b) - score(a);
    });
}

function remainingText(endsAt: string, now: number) {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `Termina en ${days} ${days === 1 ? "día" : "días"}`;
  if (hours >= 1) return `Termina en ${hours} h`;
  return `Últimos ${Math.max(1, Math.ceil(diff / 60_000))} min`;
}

export function OfferCountdown({ endsAt, dark }: { endsAt: string | null; dark?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  const text = remainingText(endsAt, now);
  if (!text) return null;
  const urgent = new Date(endsAt).getTime() - now < 48 * 3_600_000;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        urgent ? "promo-urgent text-rose-400" : dark ? "text-slate-300" : "text-slate-500"
      }`}
    >
      <Clock size={12} /> {text}
    </span>
  );
}
