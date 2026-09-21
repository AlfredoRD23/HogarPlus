import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Download,
  Facebook,
  HeartPulse,
  Home,
  Instagram,
  Package,
  Share,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { CatalogBadge } from "../components/Badges";
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

function openWhatsApp(productName?: string) {
  const text = productName
    ? `Hola, quiero ser cliente de HogarPlus. Me interesa ${productName}.`
    : "Hola, quiero ser cliente de HogarPlus.";
  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function scrollToCatalog() {
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomePage() {
  const { user } = useAuth();
  const pwa = usePwaInstall();
  const catalog = useQuery({
    queryKey: ["public-catalog"],
    queryFn: () => api<PublicProduct[]>("/api/products/public"),
  });
  const products = catalog.data?.data ?? [];
  const groups = PRODUCT_CATEGORIES.map((category) => ({
    category,
    items: products.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

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
    <div className="min-h-screen bg-[#122033] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#122033]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-300 lg:flex">
            <button type="button" className="hover:text-white" onClick={scrollToCatalog}>Catálogo</button>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
              to="/portal"
            >
              Soy cliente
            </Link>
            {user ? (
              <Link className="inline-flex h-10 items-center rounded-full bg-gold-500 px-4 text-sm font-semibold text-navy-950 hover:bg-gold-600" to={homePathFor(user.role)}>
                Ir al panel
              </Link>
            ) : (
              <Link className="inline-flex h-10 items-center rounded-full bg-gold-500 px-4 text-sm font-semibold text-navy-950 hover:bg-gold-600" to="/login">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-navy-900/80 px-5 py-10 shadow-[0_30px_90px_rgba(0,0,0,0.25)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-gold-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-300">
                <Sparkles size={14} /> Catálogo a crédito
              </p>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Productos para el hogar, con cuotas que sí se entienden.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Salud, belleza y hogar. Te afilias, eliges el artículo y pagas semanal. El buen pago sube de Bronce a Plata y Oro.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 text-sm font-semibold text-navy-950 hover:bg-gold-600" onClick={() => openWhatsApp()}>
                  Quiero ser cliente <ArrowRight size={16} />
                </button>
                <button type="button" className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10" onClick={scrollToCatalog}>
                  Ver catálogo
                </button>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-gold-400 bg-gold-500/20 px-5 text-sm font-semibold text-gold-100 hover:bg-gold-500/30"
                onClick={() => void handleInstall()}
              >
                <Download size={18} />
                {pwa.installed ? "HogarPlus ya está instalada" : "Instalar aplicación"}
              </button>
              {pwa.ios && !pwa.installed ? (
                <p className="mt-3 flex items-start gap-2 text-sm text-gold-100">
                  <Share size={16} className="mt-0.5 shrink-0" />
                  En iPhone: Compartir → Añadir a pantalla de inicio.
                </p>
              ) : null}
            </div>
            <div className="grid gap-3">
              <Pillar icon={HeartPulse} title="Salud" text="Bienestar y cuidado frecuente." />
              <Pillar icon={Sparkles} title="Belleza" text="Skincare, maquillaje y recompra." />
              <Pillar icon={Home} title="Hogar" text="Electrodomésticos y artículos prácticos." />
            </div>
          </div>
        </section>

        <section id="catalogo" className="mt-16 scroll-mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-300">Catálogo</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Lo que puedes pedir</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Bronce, Plata y Oro. Si te gusta uno, te escribimos por WhatsApp y te afiliamos.
            </p>
          </div>
          {catalog.isLoading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-3xl bg-navy-900" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-400">Pronto verás los productos aquí.</p>
          ) : (
            <div className="mt-10 space-y-12">
              {groups.map((group) => (
                <div key={group.category}>
                  <h3 className="font-display text-2xl font-semibold text-gold-100">{CATEGORY_LABELS[group.category]}</h3>
                  <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((product) => (
                      <article key={product.id} className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-navy-900">
                        <div className="relative h-44 shrink-0 bg-navy-800">
                          {product.imageUrl ? (
                            <img src={mediaUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-500">
                              <Package size={32} />
                            </div>
                          )}
                          <div className="absolute left-3 top-3">
                            <CatalogBadge tier={product.catalogTier} />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h4 className="line-clamp-1 text-lg font-semibold">{product.name}</h4>
                          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-400">
                            {product.description || "Producto HogarPlus"}
                          </p>
                          <p className="mt-3 font-display text-2xl text-gold-100">{money(product.price)}</p>
                          <button
                            type="button"
                            className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-xl bg-gold-500 text-sm font-semibold text-navy-950 hover:bg-gold-600"
                            onClick={() => openWhatsApp(product.name)}
                          >
                            Quiero este
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-4 rounded-[32px] border border-white/10 bg-navy-900/80 p-6 sm:grid-cols-3 sm:p-8">
          <Step n="01" title="Afiliación" text="Un pago de entrada y las condiciones claras desde el primer día." />
          <Step n="02" title="Cuota semanal" text="Ves tu saldo, las fechas y cada cobro aplicado." />
          <Step n="03" title="Puntos y niveles" text="El buen pago sube de Inicial a Bronce, Plata y Oro." />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-navy-900 p-6">
            <Wallet className="text-gold-300" />
            <h2 className="mt-3 text-2xl font-semibold">Para el equipo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Clientes, inventario, créditos, cobranza y reportes en un solo panel.
            </p>
            <Link className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-navy-900 hover:bg-slate-100" to={user ? homePathFor(user.role) : "/login"}>
              {user ? "Abrir panel" : "Entrar al panel"}
            </Link>
          </div>
          <div className="rounded-[28px] border border-gold-500/25 bg-navy-900 p-6">
            <h2 className="text-2xl font-semibold text-gold-100">Para el cliente</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Consulta tu nivel, puntos, productos de tu categoría y si las cuotas están pendientes.
            </p>
            <Link className="mt-5 inline-flex h-11 items-center rounded-xl bg-gold-500 px-5 text-sm font-semibold text-navy-950 hover:bg-gold-600" to="/portal">
              Entrar a mi cuenta
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-8 sm:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-navy-900">
          <div className="grid gap-8 p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <Logo />
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                Productos para el hogar con cuotas semanales. Escríbenos y te afiliamos.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gold-100">Contacto</p>
              <button type="button" className="mt-3 text-left text-sm text-slate-300 hover:text-white" onClick={() => openWhatsApp()}>
                WhatsApp 829-881-9361
              </button>
              <p className="mt-1 text-sm text-slate-400">info@hogarplus.do</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gold-100">Redes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://www.facebook.com/hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/10">
                  <Facebook size={16} /> Facebook
                </a>
                <a href="https://www.instagram.com/hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/10">
                  <Instagram size={16} /> Instagram
                </a>
                <a href="https://www.tiktok.com/@hogarplus" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/10">
                  TikTok
                </a>
              </div>
            </div>
          </div>
          <p className="border-t border-white/10 px-6 py-4 text-xs text-slate-500 sm:px-8">
            © {new Date().getFullYear()} HogarPlus. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Pillar({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-500 text-navy-950">
        <Icon size={20} />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{text}</p>
      </div>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gold-300">{n}</p>
      <p className="mt-1 text-xl font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
