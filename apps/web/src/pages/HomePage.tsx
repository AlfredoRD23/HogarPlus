import { Link } from "react-router-dom";
import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Facebook,
  Flame,
  Info,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Share,
  Sparkles,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { CatalogTierTabs, type CatalogTierFilter } from "../components/CatalogTierTabs";
import { promoRank, ShowcaseCard, type ShowcaseProduct } from "../components/Promo";
import { LevelsInfoModal } from "../components/LevelsInfo";
import { homePathFor, CATEGORY_LABELS, PRODUCT_CATEGORIES, type ProductCategory } from "@hogarplus/shared";
import { useAuth } from "../auth/AuthContext";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { api, money } from "../lib/api";

const WHATSAPP_NUMBER = "18298819361";

type PublicProduct = ShowcaseProduct & {
  category: ProductCategory;
};

function whatsappHref(product?: PublicProduct) {
  const offerNote = product?.offer
    ? product.offer.type === "DISCOUNT"
      ? ` con la oferta ${product.offer.headline}`
      : ` con la oferta: ${product.offer.detail}`
    : "";
  const text = product
    ? `Hola, quiero ser cliente de HogarPlus. Me interesa ${product.name} (${money(product.finalPrice)})${offerNote}.`
    : "Hola, quiero ser cliente de HogarPlus.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function openWhatsApp(product?: PublicProduct) {
  window.open(whatsappHref(product), "_blank", "noopener,noreferrer");
}

function scrollToCatalog() {
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToOffers() {
  document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToContact() {
  document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const CONTACT_EMAIL = "hogarplusdr@gmail.com";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61594514707916";
const INSTAGRAM_URL = "https://www.instagram.com/hogarplusdr2026";

function ContactCard({
  icon,
  title,
  value,
  cta,
  href,
  accent,
  primary,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  cta: string;
  href: string;
  accent: string;
  primary?: boolean;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group flex flex-col rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 ${
        primary
          ? "border-gold-500/50 bg-gradient-to-br from-gold-500/20 to-white/[0.03] hover:border-gold-500"
          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: accent }}>
        {icon}
      </span>
      <p className="mt-4 text-sm font-medium text-slate-400">{title}</p>
      <p className="mt-1 break-all font-semibold text-white">{value}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300 transition group-hover:gap-2.5 group-hover:text-gold-100">
        {cta} <ArrowRight size={14} />
      </span>
    </a>
  );
}

function ConsultButton({ product }: { product: PublicProduct }) {
  return (
    <a
      href={whatsappHref(product)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
        product.offer
          ? "bg-gold-500 text-navy-950 hover:bg-gold-600"
          : "border border-gold-500/50 text-gold-100 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-950"
      }`}
    >
      {product.offer ? "La quiero" : "Consultar"}
      <ArrowRight size={14} />
    </a>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const pwa = usePwaInstall();
  const [tier, setTier] = useState<CatalogTierFilter>("ALL");
  const [levelsOpen, setLevelsOpen] = useState(false);
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
  const highlights = promoRank(products);
  const offerCount = products.filter((item) => item.offer).length;

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
    <div className="home-page min-h-screen bg-[#1A2F52] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1A2F52]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 lg:flex">
            <button type="button" className="transition hover:text-white" onClick={scrollToCatalog}>
              Catálogo
            </button>
            <button
              type="button"
              className="transition hover:text-white"
              onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Cómo funciona
            </button>
            <button type="button" className="transition hover:text-white" onClick={scrollToContact}>
              Contacto
            </button>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label="Contacto"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10 sm:h-10 sm:w-10 lg:hidden"
              onClick={scrollToContact}
            >
              <MessageCircle size={16} />
            </button>
            <Link
              className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10 sm:h-10 sm:px-4 sm:text-sm"
              to="/portal"
            >
              Soy cliente
            </Link>
            {user ? (
              <Link
                className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-gold-500 px-3 text-xs font-semibold text-navy-950 transition hover:bg-gold-600 sm:h-10 sm:px-4 sm:text-sm"
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
        {/* Softer than login: less opaque navy wash */}
        <div className="absolute inset-0 bg-[#1A2F52]/55" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A2F52]/88 via-[#1A2F52]/55 to-[#1A2F52]/25" aria-hidden />

        <div className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:min-h-[calc(100svh-4rem)] sm:px-8 sm:py-20">
          <div className="home-fade max-w-2xl">
            {highlights.length > 0 ? (
              <button
                type="button"
                onClick={scrollToOffers}
                className="promo-enter mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-[#1A2F52]/70 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-gold-100 backdrop-blur transition hover:bg-[#1A2F52]"
              >
                <span className="promo-ribbon">
                  <Flame size={13} strokeWidth={2.5} />
                  {offerCount > 0 ? `${offerCount} ${offerCount === 1 ? "oferta" : "ofertas"}` : "Nuevo"}
                </span>
                {offerCount > 0 ? "Descuentos y regalos esta semana" : "Mira lo que acaba de llegar"}
                <ArrowRight size={14} />
              </button>
            ) : null}
            <p className="font-display text-4xl font-semibold tracking-tight text-gold-100 sm:text-5xl lg:text-6xl">
              HogarPlus
            </p>
            <h1 className="mt-4 max-w-xl text-2xl font-medium leading-snug text-white sm:text-3xl lg:text-4xl">
              Productos para el hogar, con cuotas que sí se entienden.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">
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
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                onClick={scrollToCatalog}
              >
                Ver catálogo
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <button
                type="button"
                className="inline-flex items-center gap-2 font-medium text-gold-300 transition hover:text-gold-100"
                onClick={() => void handleInstall()}
              >
                <Download size={15} />
                {pwa.installed ? "App instalada" : "Instalar app"}
              </button>
              <span className="hidden text-white/25 sm:inline">·</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-medium text-gold-300 transition hover:text-gold-100"
                onClick={() => setLevelsOpen(true)}
              >
                <Info size={15} /> Niveles Bronce, Plata y Oro
              </button>
            </div>
            {pwa.ios && !pwa.installed ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-gold-200/90">
                <Share size={15} className="mt-0.5 shrink-0" />
                En iPhone: Compartir → Añadir a pantalla de inicio.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <main>
        {highlights.length > 0 ? (
          <section id="ofertas" className="relative scroll-mt-24 overflow-hidden border-t border-gold-500/20 bg-[#132540] py-16 sm:py-20">
            <div className="home-glow pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" aria-hidden />
            <div className="home-glow pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl" aria-hidden />
            <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
              <div className="flex items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
                    <Sparkles size={14} className="promo-float" /> Ofertas y novedades
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Aprovecha antes de que se acaben</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    Descuentos, regalos y lo último que llegó. Escríbenos y te lo apartamos.
                  </p>
                </div>
              </div>
              <HighlightsCarousel products={highlights} />
            </div>
          </section>
        ) : null}

        <section id="catalogo" className="scroll-mt-24 border-t border-white/10 bg-[#15263f] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Catálogo</p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Lo que puedes pedir</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                Elige un producto y escríbenos por WhatsApp. Te afiliamos y te explicamos las cuotas.
              </p>
            </div>

            <div className="mt-8">
              <CatalogTierTabs value={tier} onChange={setTier} counts={tierCounts} variant="dark" />
            </div>

            {catalog.isLoading ? (
              <div className="mt-10 flex gap-4 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-80 min-w-full animate-pulse rounded-3xl bg-navy-800/60 lg:min-w-[calc((100%-2rem)/3)]" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="mt-10 text-sm text-slate-400">
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

        <section id="como-funciona" className="scroll-mt-24 bg-[#1A2F52] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Proceso</p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Así de claro funciona</h2>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-8">
              <Step n="01" title="Afiliación" text="Un pago de entrada y las condiciones claras desde el primer día." />
              <Step n="02" title="Cuota semanal" text="Ves tu saldo, las fechas y cada cobro aplicado en tu cuenta." />
              <Step n="03" title="Puntos y niveles" text="El buen pago sube de Inicial a Bronce, Plata y Oro." />
            </ol>
            <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-gold-500/25 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex -space-x-2">
                  {["#B87333", "#8E9AA8", "#C4A04A"].map((color) => (
                    <span key={color} className="h-8 w-8 rounded-full ring-2 ring-[#1A2F52]" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <div>
                  <p className="font-semibold text-white">Tu nivel HOGAR PLUS</p>
                  <p className="text-sm text-slate-300">Bronce, Plata y Oro: qué significa cada uno y cómo avanzar.</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 text-sm font-semibold text-navy-950 transition hover:bg-gold-600"
                onClick={() => setLevelsOpen(true)}
              >
                <Info size={16} /> Más información
              </button>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#15263f] py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Tu cuenta</p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Todo desde el celular</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                Consulta tu nivel, puntos, productos de tu categoría y si las cuotas están pendientes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-gold-500 px-6 text-sm font-semibold text-navy-950 transition hover:bg-gold-600"
                  to="/portal"
                >
                  Entrar a mi cuenta
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
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

        <section id="contacto" className="relative scroll-mt-24 overflow-hidden border-t border-gold-500/20 bg-[#1A2F52] py-16 sm:py-20">
          <div className="home-glow pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Contacto</p>
                <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Hablemos</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                  ¿Quieres afiliarte, preguntar por un producto o saber de tu cuenta? Escríbenos por el medio que prefieras y te respondemos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openWhatsApp()}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/20 transition hover:brightness-110"
              >
                <MessageCircle size={18} /> Escribir por WhatsApp
              </button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ContactCard
                primary
                icon={<Phone size={20} />}
                title="WhatsApp"
                value="829-881-9361"
                cta="Enviar mensaje"
                href={whatsappHref()}
                accent="#25D366"
              />
              <ContactCard
                icon={<Mail size={20} />}
                title="Correo"
                value={CONTACT_EMAIL}
                cta="Enviar correo"
                href={`mailto:${CONTACT_EMAIL}`}
                accent="#C4A04A"
              />
              <ContactCard
                icon={<Facebook size={20} />}
                title="Facebook"
                value="HogarPlus"
                cta="Visitar página"
                href={FACEBOOK_URL}
                accent="#1877F2"
              />
              <ContactCard
                icon={<Instagram size={20} />}
                title="Instagram"
                value="@hogarplusdr2026"
                cta="Seguirnos"
                href={INSTAGRAM_URL}
                accent="#E1306C"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#122033]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Productos para el hogar con cuotas semanales. Escríbenos y te afiliamos.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gold-100">Contacto</p>
            <button type="button" className="mt-3 block text-left text-sm text-slate-300 transition hover:text-white" onClick={() => openWhatsApp()}>
              WhatsApp 829-881-9361
            </button>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-sm text-slate-400 transition hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div>
            <p className="text-sm font-semibold text-gold-100">Redes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 transition hover:bg-white/10">
                <Facebook size={16} /> Facebook
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 transition hover:bg-white/10">
                <Instagram size={16} /> Instagram
              </a>
              <a href="https://www.tiktok.com/@hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 transition hover:bg-white/10">
                TikTok
              </a>
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500 sm:px-8">
          © {new Date().getFullYear()} HogarPlus. Todos los derechos reservados.
        </p>
      </footer>
      {levelsOpen && <LevelsInfoModal onClose={() => setLevelsOpen(false)} />}
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
        <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
        {products.length > 1 ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              onClick={() => move(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}
      </div>
      <div ref={ref} className="carousel items-stretch">
        {products.map((product) => (
          <ShowcaseCard
            key={product.id}
            product={product}
            className="min-w-full lg:min-w-[calc((100%-2rem)/3)] lg:w-[calc((100%-2rem)/3)]"
            action={<ConsultButton product={product} />}
          />
        ))}
      </div>
    </div>
  );
}

function HighlightsCarousel({ products }: { products: PublicProduct[] }) {
  return (
    <div className="carousel mt-10 items-stretch pb-2 pt-1">
      {products.map((product, index) => (
        <ShowcaseCard
          key={product.id}
          product={product}
          eyebrow={CATEGORY_LABELS[product.category]}
          delay={Math.min(index, 5) * 90}
          className="min-w-[85%] sm:min-w-[calc((100%-1rem)/2)] sm:w-[calc((100%-1rem)/2)] lg:min-w-[calc((100%-2rem)/3)] lg:w-[calc((100%-2rem)/3)]"
          action={<ConsultButton product={product} />}
        />
      ))}
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="relative border-t border-gold-500/35 pt-5">
      <p className="text-sm font-semibold tracking-wide text-gold-300">{n}</p>
      <p className="mt-2 text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </li>
  );
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
