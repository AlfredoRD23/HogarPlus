import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Download, Facebook, HeartPulse, Home, Instagram, Package, Share, Sparkles, Wallet } from "lucide-react";
import { Logo } from "../components/Logo";
import { CatalogBadge } from "../components/Badges";
import { homePathFor, CATEGORY_LABELS, PRODUCT_CATEGORIES, type CatalogTier, type ProductCategory } from "@hogarplus/shared";
import { useAuth } from "../auth/AuthContext";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { api, mediaUrl, money } from "../lib/api";

const WHATSAPP_NUMBER = "18298819361";
const WHATSAPP_TEXT = "Hola, quiero ser cliente de HogarPlus.";

type PublicProduct = {
  id: string;
  name: string;
  description?: string | null;
  category: ProductCategory;
  catalogTier: CatalogTier;
  price: number;
  imageUrl?: string | null;
};

function openWhatsApp() {
  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`,
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
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link className="hidden rounded-xl px-3 py-2 text-gold-100 sm:inline" to="/portal">
            Soy cliente
          </Link>
          {user ? (
            <Link className="btn-gold" to={homePathFor(user.role)}>
              Ir al panel
            </Link>
          ) : (
            <Link className="btn-gold" to="/login">
              Entrar
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="text-sm font-medium text-gold-300">Catálogo a crédito</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Productos para el hogar, con pagos semanales que sí se entienden.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              HogarPlus acerca salud, belleza y artículos del hogar con afiliación simple, cuotas claras y un sistema de puntos que premia el buen pago. Instala la app para consultar o gestionar desde el teléfono.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-gold" onClick={openWhatsApp}>
                Quiero ser cliente
              </button>
              <button
                type="button"
                className="btn-ghost border-white/20 bg-transparent text-white hover:bg-navy-800"
                onClick={scrollToCatalog}
              >
                Ver catálogo
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-ghost border-white/20 bg-transparent text-white hover:bg-navy-800" onClick={() => void handleInstall()}>
                <Download size={18} />
                {pwa.installed ? "Ya está instalada" : "Descargar app"}
              </button>
              <Link className="btn-ghost border-white/20 bg-transparent text-white hover:bg-navy-800" to="/portal">
                Soy cliente
              </Link>
            </div>
            {pwa.ios && !pwa.installed && (
              <p className="mt-4 flex items-start gap-2 text-sm text-gold-100">
                <Share size={16} className="mt-0.5 shrink-0" />
                En iPhone o iPad: Compartir → Añadir a pantalla de inicio.
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Pillar icon={HeartPulse} title="Salud" text="Bienestar y cuidado frecuente." />
            <Pillar icon={Sparkles} title="Belleza" text="Skincare, maquillaje y recompra." />
            <Pillar icon={Home} title="Hogar" text="Electrodomésticos y artículos prácticos." />
          </div>
        </section>

        <section id="catalogo" className="scroll-mt-6 rounded-3xl bg-white p-6 text-navy-900 sm:p-8">
          <p className="text-sm font-medium text-gold-600">Catálogo</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">Lo que puedes pedir</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Bronce, Plata y Oro. Si quieres alguno, pulsa Quiero ser cliente y te atendemos por WhatsApp.
          </p>
          {catalog.isLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Pronto verás los productos aquí.</p>
          ) : (
            <div className="mt-8 space-y-10">
              {groups.map((group) => (
                <div key={group.category}>
                  <h3 className="font-display text-2xl font-semibold">{CATEGORY_LABELS[group.category]}</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((product) => (
                      <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="relative h-40 bg-slate-100">
                          {product.imageUrl ? (
                            <img src={mediaUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              <Package size={28} />
                            </div>
                          )}
                          <div className="absolute left-3 top-3">
                            <CatalogBadge tier={product.catalogTier} />
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="font-semibold leading-tight">{product.name}</p>
                          {product.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
                          ) : null}
                          <p className="mt-2 font-display text-xl">{money(product.price)}</p>
                          <button type="button" className="btn-gold mt-3 w-full btn-compact" onClick={openWhatsApp}>
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

        <section className="mt-10 grid gap-4 rounded-3xl bg-navy-900 p-6 sm:grid-cols-3 sm:p-8">
          <Step n="1" title="Afiliación" text="Un pago de entrada y las condiciones claras desde el primer día." />
          <Step n="2" title="Cuota semanal" text="El cliente ve su saldo, las fechas de pago y cada cobro aplicado." />
          <Step n="3" title="Puntos y niveles" text="El buen pago sube de Inicial a Bronce, Plata y Oro, y abre más productos." />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 text-navy-900">
            <Wallet className="text-gold-600" />
            <h2 className="mt-3 text-2xl font-semibold">Para el equipo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Clientes, inventario, créditos, cobranza y reportes en un solo panel.
            </p>
            <Link className="btn-primary mt-5" to={user ? homePathFor(user.role) : "/login"}>
              {user ? "Abrir panel" : "Entrar al panel"}
            </Link>
          </div>
          <div className="rounded-3xl border border-gold-500/25 bg-navy-900 p-6">
            <h2 className="text-2xl font-semibold text-gold-100">Para el cliente</h2>
            <p className="mt-2 text-sm text-slate-300">
              Consulta tu nivel, puntos, productos de tu categoría y si las cuotas están pendientes o atrasadas.
            </p>
            <Link className="btn-gold mt-5" to="/portal">
              Soy cliente
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-navy-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-300">
              Productos para el hogar con cuotas semanales. Escríbenos y te afiliamos.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gold-100">Contacto</p>
            <button type="button" className="mt-3 text-left text-sm text-slate-300 hover:text-white" onClick={openWhatsApp}>
              WhatsApp 829-881-9361
            </button>
            <p className="mt-1 text-sm text-slate-400">info@hogarplus.do</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gold-100">Redes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://www.facebook.com/hogarplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <Facebook size={16} /> Facebook
              </a>
              <a
                href="https://www.instagram.com/hogarplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                <Instagram size={16} /> Instagram
              </a>
              <a
                href="https://www.tiktok.com/@hogarplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                TikTok
              </a>
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-5 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} HogarPlus. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

function Pillar({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gold-500/25 bg-navy-900 p-5">
      <Icon className="text-gold-300" size={22} />
      <p className="mt-3 text-xl font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-gold-300">{n}</p>
      <p className="mt-1 text-xl font-semibold">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );
}
