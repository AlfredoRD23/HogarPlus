import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, HeartPulse, Home, Share, Sparkles, Wallet } from "lucide-react";
import { Logo } from "../components/Logo";
import { homePathFor } from "@hogarplus/shared";
import { useAuth } from "../auth/AuthContext";
import { usePwaInstall } from "../hooks/usePwaInstall";

export function HomePage() {
  const { user } = useAuth();
  const pwa = usePwaInstall();

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
              <button type="button" className="btn-gold" onClick={() => void handleInstall()}>
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

        <section className="grid gap-4 rounded-3xl bg-navy-900 p-6 sm:grid-cols-3 sm:p-8">
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
            <button type="button" className="btn-gold mt-5" onClick={() => void handleInstall()}>
              <Download size={18} /> Instalar HogarPlus
            </button>
          </div>
        </section>
      </main>
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
