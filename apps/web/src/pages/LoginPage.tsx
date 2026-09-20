import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Logo } from "../components/Logo";
import { WaitLabel } from "../components/Loader";
import { useAuth } from "../auth/AuthContext";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { emailError, firstError, homePathFor } from "@hogarplus/shared";

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
          <h2 className="mt-4 text-4xl font-semibold leading-tight">Más que un catálogo, una oportunidad para tu hogar.</h2>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-sm">
            {["Salud", "Belleza", "Hogar"].map((item) => (
              <div key={item} className="rounded-2xl border border-gold-500/25 bg-navy-800 py-4">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-300">Cartera · Cobranza · Inventario</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          className="panel w-full max-w-md p-8"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const message = firstError([emailError(email), password.length < 6 ? "La contraseña es obligatoria" : null]);
            if (message) {
              toast.error(message);
              return;
            }
            setLoading(true);
            try {
              const account = await login(email.trim(), password);
              if (remember) localStorage.setItem(EMAIL_KEY, email.trim());
              else localStorage.removeItem(EMAIL_KEY);
              toast.success("Bienvenido a HogarPlus");
              navigate(homePathFor(account.role));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo entrar");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="lg:hidden">
            <Logo light />
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-navy-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-500">Ingresa con tu correo y contraseña.</p>
          <div className="mt-6">
            <Field label="Correo" hint={fieldHint("email")} required>
              <FormattedInput kind="email" required autoComplete="username" value={email} onValue={setEmail} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Contraseña" required>
              <FormattedInput kind="password" required autoComplete="current-password" value={password} onValue={setPassword} placeholder="Tu contraseña" />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Recordar correo en este equipo
          </label>
          <button className="btn-gold mt-6 w-full" disabled={loading}>
            <WaitLabel waiting={loading} idle="Entrar" busy="Entrando..." />
          </button>
      <p className="mt-4 text-center text-xs text-slate-500">
            <a className="text-navy-700 underline" href="/">Inicio</a>
            {" · "}
            <a className="text-navy-700 underline" href="/portal">Soy cliente</a>
          </p>
        </form>
      </section>
    </div>
  );
}
