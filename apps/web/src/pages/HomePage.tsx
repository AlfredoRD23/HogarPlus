import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Facebook,
  Instagram,
  Package,
  Share,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { CatalogBadge } from "../components/Badges";
import { CatalogTierTabs, type CatalogTierFilter } from "../components/CatalogTierTabs";
import { homePathFor, CATEGORY_LABELS, PRODUCT_CATEGORIES, type CatalogTier, type ProductCategory } from "@hogarplus/shared";
import { useAuth } from "../auth/AuthContext";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { api, mediaUrl, money } from "../lib/api";

const WHATSAPP_NUMBER = "18298819361";

type PublicProduct = {
  id: string;
  name: string;
  description?: string | null;
  category: ProductCategory;
  catalogTier: CatalogTier;
  price: number;
  imageUrl?: string | null;
};

function whatsappHref(product?: { name: string; price: number }) {
  const text = product
    ? `Hola, quiero ser cliente de HogarPlus. Me interesa ${product.name} (${money(product.price)}).`
    : "Hola, quiero ser cliente de HogarPlus.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function openWhatsApp(product?: { name: string; price: number }) {
  window.open(whatsappHref(product), "_blank", "noopener,noreferrer");
}

function scrollToCatalog() {
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomePage() {
  const { user } = useAuth();
  const pwa = usePwaInstall();
  const [tier, setTier] = useState<CatalogTierFilter>("ALL");
  const catalog = useQuery({
    queryKey: ["public-catalog"],
    queryFn: () => api<PublicProduct[]>("/api/products/public"),
  });
  const products = catalog.data?.data ?? [];
  const filtered = tier === "ALL" ? products : products.filter((item) => item.catalogTier === tier);
  const groups = PRODUCT_CATEGORIES.map((category) => ({
    category,
    items: filtered.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
  const tierCounts = {
    ALL: products.length,
    A: products.filter((item) => item.catalogTier === "A").length,
    B: products.filter((item) => item.catalogTier === "B").length,
    C: products.filter((item) => item.catalogTier === "C").length,
  };

  async function handleInstall() {
    if (pwa.installed) {
      toast.success("HogarPlus ya está instalada en este dispositivo");
      return;
    }
    if (pwa.ios) {
      toast("En iPhone: toca Compartir y luego Añadir a pantalla de inicio", { icon: "📱", duration: 6000 });
      return;
    }
    if (pwa.canInstall) {
      const ok = await pwa.install();
      if (ok) toast.success("Aplicación instalada");
      return;
    }
    toast("Abre el menú del navegador y elige Instalar aplicación o Añadir a inicio", { duration: 5000 });
  }

  return (
    <div className="home-page min-h-screen bg-slate-50 text-navy-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-8">
          <Logo light />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <button type="button" className="transition hover:text-navy-900" onClick={scrollToCatalog}>
              Catálogo
            </button>
            <button
              type="button"
              className="transition hover:text-navy-900"
              onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Cómo funciona
            </button>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 px-3 text-xs font-semibold text-navy-900 transition hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
              to="/portal"
            >
              Soy cliente
            </Link>
            {user ? (
              <Link
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-navy-900 px-3 text-xs font-semibold text-white transition hover:bg-navy-800 sm:h-10 sm:px-4 sm:text-sm"
                to={homePathFor(user.role)}
              >
                Panel
              </Link>
            ) : (
              <Link
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-gold-500 px-3 text-xs font-semibold text-navy-950 transition hover:bg-gold-600 sm:h-10 sm:px-4 sm:text-sm"
                to="/login"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="home-hero relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/portal-hogar.jpg")' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#122033]/72" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-[#122033]/92 via-[#122033]/70 to-[#122033]/35" aria-hidden />

        <div className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:min-h-[calc(100svh-4rem)] sm:px-8 sm:py-20">
          <div className="home-fade max-w-2xl text-white">
            <p className="font-display text-4xl font-semibold tracking-tight text-gold-100 sm:text-5xl lg:text-6xl">
              HogarPlus
            </p>
            <h1 className="mt-4 max-w-xl text-2xl font-medium leading-snug text-white sm:text-3xl lg:text-4xl">
              Productos para el hogar, con cuotas que sí se entienden.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Te afilias, eliges el artículo y pagas semanal. El buen pago sube de Bronce a Plata y Oro.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-6 text-sm font-semibold text-navy-950 transition hover:bg-gold-600"
                onClick={() => openWhatsApp()}
              >
                Quiero ser cliente <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                onClick={scrollToCatalog}
              >
                Ver catálogo
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <button
                type="button"
                className="inline-flex items-center gap-2 font-medium text-gold-200 transition hover:text-gold-100"
                onClick={() => void handleInstall()}
              >
                <Download size={15} />
                {pwa.installed ? "App instalada" : "Instalar app"}
              </button>
              <span className="hidden text-white/25 sm:inline">·</span>
              <span>Salud · Belleza · Hogar</span>
            </div>
            {pwa.ios && !pwa.installed ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-slate-300">
                <Share size={15} className="mt-0.5 shrink-0" />
                En iPhone: Compartir → Añadir a pantalla de inicio.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <main>
        <section id="catalogo" className="scroll-mt-24 border-t border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">Lo que puedes pedir</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Elige un producto y escríbenos por WhatsApp. Te afiliamos y te explicamos las cuotas.
              </p>
            </div>

            <div className="mt-8">
              <CatalogTierTabs value={tier} onChange={setTier} counts={tierCounts} />
            </div>

            {catalog.isLoading ? (
              <div className="mt-10 flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-80 min-w-full animate-pulse rounded-3xl bg-slate-100 lg:min-w-[calc((100%-2rem)/3)]" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="mt-10 text-sm text-slate-500">
                {products.length === 0 ? "Pronto verás los productos aquí." : "No hay productos en esta categoría."}
              </p>
            ) : (
              <div className="mt-12 space-y-14">
                {groups.map((group) => (
                  <CategoryCarousel key={group.category} title={CATEGORY_LABELS[group.category]} products={group.items} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">Así de claro funciona</h2>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
              <Step n="01" title="Afiliación" text="Un pago de entrada y las condiciones claras desde el primer día." />
              <Step n="02" title="Cuota semanal" text="Ves tu saldo, las fechas y cada cobro aplicado en tu cuenta." />
              <Step n="03" title="Puntos y niveles" text="El buen pago sube de Inicial a Bronce, Plata y Oro." />
            </ol>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">Todo desde el celular</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                Consulta tu nivel, puntos, productos de tu categoría y si las cuotas están pendientes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-navy-900 px-6 text-sm font-semibold text-white transition hover:bg-navy-800"
                  to="/portal"
                >
                  Entrar a mi cuenta
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-6 text-sm font-semibold text-navy-900 transition hover:bg-slate-50"
                  to={user ? homePathFor(user.role) : "/login"}
                >
                  {user ? "Abrir panel" : "Soy del equipo"}
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoTile title="Nivel y puntos" text="Bronce, Plata u Oro según tu historial de pagos." />
              <InfoTile title="Catálogo por categoría" text="Solo ves y pides lo que tu nivel permite." />
              <InfoTile title="Comprobantes" text="Subes el pago y te llega la factura." />
              <InfoTile title="Panel del equipo" text="Clientes, créditos, cobranza y rutas." />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-8">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              Productos para el hogar con cuotas semanales. Escríbenos y te afiliamos.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">Contacto</p>
            <button type="button" className="mt-3 block text-left text-sm text-slate-600 transition hover:text-navy-900" onClick={() => openWhatsApp()}>
              WhatsApp 829-881-9361
            </button>
            <p className="mt-1 text-sm text-slate-500">info@hogarplus.do</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900">Redes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="https://www.facebook.com/hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50">
                <Facebook size={16} /> Facebook
              </a>
              <a href="https://www.instagram.com/hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50">
                <Instagram size={16} /> Instagram
              </a>
              <a href="https://www.tiktok.com/@hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm text-slate-700 transition hover:bg-slate-50">
                TikTok
              </a>
            </div>
          </div>
        </div>
        <p className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500 sm:px-8">
          © {new Date().getFullYear()} HogarPlus. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

function CategoryCarousel({ title, products }: { title: string; products: PublicProduct[] }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    const card = node.querySelector("article");
    const step = (card instanceof HTMLElement ? card.offsetWidth : node.clientWidth) + 16;
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-navy-900">{title}</h3>
        {products.length > 1 ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 transition hover:bg-slate-50"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 transition hover:bg-slate-50"
              onClick={() => move(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      </div>
      <div ref={ref} className="carousel items-stretch">
        {products.map((product) => (
          <article
            key={product.id}
            className="group flex min-w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-w-[calc((100%-2rem)/3)] lg:w-[calc((100%-2rem)/3)]"
          >
            <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-100">
              {product.imageUrl ? (
                <img
                  src={mediaUrl(product.imageUrl)}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <Package size={28} />
                </div>
              )}
              <div className="absolute left-3 top-3">
                <CatalogBadge tier={product.catalogTier} />
              </div>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
              <h4 className="line-clamp-1 text-[1.05rem] font-semibold tracking-tight text-navy-900">{product.name}</h4>
              <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
                {product.description || "Disponible a crédito con cuotas semanales."}
              </p>
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Precio</p>
                  <p className="mt-0.5 font-display text-xl text-navy-900">{money(product.price)}</p>
                </div>
                <a
                  href={whatsappHref(product)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-900 transition hover:border-gold-500 hover:bg-gold-500 hover:text-navy-950"
                >
                  Consultar
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="relative border-t border-slate-200 pt-5">
      <p className="text-sm font-semibold tracking-wide text-gold-600">{n}</p>
      <p className="mt-2 text-xl font-semibold text-navy-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </li>
  );
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <p className="font-semibold text-navy-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
