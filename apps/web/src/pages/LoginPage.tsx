import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Logo } from "../components/Logo";
import { useAuth } from "../auth/AuthContext";

const EMAIL_KEY = "hogarplus.lastEmail";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(localStorage.getItem(EMAIL_KEY)));
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <p className="text-gold-300">Productos de calidad · Pago semanal · Más beneficios</p>
          <h2 className="mt-4 font-display text-5xl leading-tight">Más que un catálogo, una oportunidad para tu hogar.</h2>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-sm">
            {["Salud", "Belleza", "Hogar"].map((item) => (
              <div key={item} className="rounded-2xl border border-gold-500/30 bg-navy-800 py-4">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-300">Acceso interno · Cartera · Cobranza · Inventario</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          className="panel w-full max-w-md p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await login(email, password);
              if (remember) localStorage.setItem(EMAIL_KEY, email);
              else localStorage.removeItem(EMAIL_KEY);
              toast.success("Bienvenido a HogarPlus");
              navigate("/dashboard");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo entrar");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-4 font-display text-3xl text-navy-900">Ingreso al sistema</h1>
          <p className="mt-2 text-sm text-slate-500">Usa tu usuario real. La sesión se valida contra la base de datos.</p>
          <label className="mt-6 block">
            <span className="label">Correo</span>
            <input className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="mt-4 block">
            <span className="label">Contraseña</span>
            <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Recordar correo en este equipo
          </label>
          <button className="btn-gold mt-6 w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
      <p className="mt-4 text-center text-xs text-slate-500">
            <a className="text-navy-700 underline" href="/">Inicio</a>
            {" · "}
            <a className="text-navy-700 underline" href="/portal">Portal del cliente</a>
          </p>
        </form>
      </section>
    </div>
  );
}
