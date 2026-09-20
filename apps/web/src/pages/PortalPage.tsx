import { useState } from "react";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Logo } from "../components/Logo";
import { CatalogBadge, LevelBadge, InstallmentBadge } from "../components/Badges";
import { FormattedInput } from "../components/Form";
import {
  CATEGORY_LABELS,
  catalogAccessLabel,
  cedulaError,
  digitsOnly,
  firstError,
  LEVEL_LABELS,
  phoneError,
  POINTS_ACTION_LABELS,
  progressToNextLevel,
  type CatalogTier,
  type ClientLevel,
  type InstallmentStatus,
  type PointsAction,
  type ProductCategory,
} from "@hogarplus/shared";

type PortalData = {
  client: { code: string; name: string; points: number; level: ClientLevel; affiliationPaid: boolean };
  credits: Array<{
    id: string;
    code: string;
    balance: number;
    product: { name: string };
    installments: Array<{ id: string; number: number; dueDate: string; amount: number; status: InstallmentStatus }>;
  }>;
  payments: Array<{ id: string; amount: number; createdAt: string; type: string }>;
  catalog: Array<{
    id: string;
    name: string;
    category: ProductCategory;
    catalogTier: CatalogTier;
    price: number;
    canRequest: boolean;
    lockReason: string | null;
    requested: boolean;
  }>;
  pointsLedger: Array<{ id: string; action: PointsAction; points: number; note?: string }>;
};

export function PortalPage() {
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const identity = () => ({ documentId: digitsOnly(documentId), phone: digitsOnly(phone) });

  async function lookup() {
    const res = await api<PortalData>("/api/portal/lookup", {
      method: "POST",
      body: JSON.stringify(identity()),
    });
    setData(res.data);
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <a href="/" className="text-sm text-gold-300">Inicio</a>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="font-display text-4xl">Soy cliente</h1>
        <p className="mt-2 text-slate-300">Mira tus cuotas, pide productos de tu categoría y avisa si quieres que pasen a cobrarte.</p>
        <form
          className="mt-6 grid gap-3 rounded-2xl bg-navy-900 p-5 md:grid-cols-3"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const message = firstError([cedulaError(documentId), phoneError(phone)]);
            if (message) {
              setError(message);
              return;
            }
            try {
              await lookup();
            } catch (err) {
              setData(null);
              setError(err instanceof Error ? err.message : "No encontrado");
            }
          }}
        >
          <FormattedInput kind="cedula" required className="input text-navy-900" value={documentId} onValue={setDocumentId} placeholder="000-0000000-0" />
          <FormattedInput kind="phone" required className="input text-navy-900" value={phone} onValue={setPhone} placeholder="809-000-0000" />
          <button className="btn-gold">Consultar</button>
        </form>
        {error && <p className="mt-4 text-rose-300">{error}</p>}
        {data && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-white p-5 text-navy-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold-600">{data.client.code}</p>
                  <h2 className="font-display text-3xl">{data.client.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Puedes solicitar: {catalogAccessLabel(data.client.level)}. El resto se ve, pero está bloqueado.
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <LevelBadge level={data.client.level} />
                    <b>{data.client.points} puntos</b>
                  </div>
                  {(() => {
                    const progress = progressToNextLevel(data.client.points);
                    return (
                      <p className="mt-2 text-sm text-slate-500">
                        {progress.next
                          ? `Te faltan ${progress.remaining} pts para ${LEVEL_LABELS[progress.next]}`
                          : "Ya estás en Oro"}
                      </p>
                    );
                  })()}
                  <button
                    className="btn-gold mt-3"
                    disabled={busy === "collect"}
                    onClick={async () => {
                      setBusy("collect");
                      try {
                        await api("/api/portal/collect-me", { method: "POST", body: JSON.stringify(identity()) });
                        toast.success("Avisamos al cobrador. También le llega por correo");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "No se pudo avisar");
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    Ven a cobrarme
                  </button>
                </div>
              </div>
            </div>
            {data.credits.map((c) => {
              const pending = c.installments.filter((i) => i.status !== "PAID");
              return (
                <div key={c.id} className="rounded-2xl bg-white p-5 text-navy-900">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-display text-xl">{c.product.name}</h3>
                    <span>Saldo {money(c.balance)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-navy-800">
                    {pending.length === 0
                      ? "Este producto ya está saldado"
                      : `Te faltan ${pending.length} cuota${pending.length === 1 ? "" : "s"} de ${c.product.name}`}
                  </p>
                  {pending[0] && (
                    <p className="text-sm text-slate-500">Próxima: {formatDate(pending[0].dueDate)} · {money(pending[0].amount)}</p>
                  )}
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    {c.installments.slice(0, 10).map((i) => (
                      <div key={i.id} className="rounded-xl bg-slate-50 p-2 text-xs">
                        <p>Cuota {i.number}</p>
                        <p>{money(i.amount)}</p>
                        <InstallmentBadge status={i.status} dueDate={i.dueDate} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="rounded-2xl bg-white p-5 text-navy-900">
              <h3 className="font-display text-xl">Catálogo completo</h3>
              <p className="mt-1 text-sm text-slate-500">Ves todos los productos. Solo puedes pedir los de tu categoría.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {data.catalog.map((p) => (
                  <div key={p.id} className={`rounded-xl border p-3 ${p.canRequest ? "" : "bg-slate-50 opacity-80"}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">{CATEGORY_LABELS[p.category]}</p>
                      <CatalogBadge tier={p.catalogTier} />
                    </div>
                    <p className="font-semibold">{p.name}</p>
                    <p>{money(p.price)}</p>
                    {p.canRequest ? (
                      <button
                        className="btn-primary mt-3 w-full"
                        disabled={p.requested || busy === p.id}
                        onClick={async () => {
                          setBusy(p.id);
                          try {
                            await api("/api/portal/request", {
                              method: "POST",
                              body: JSON.stringify({ ...identity(), productId: p.id }),
                            });
                            toast.success("Solicitud enviada. El equipo recibe aviso en la app y por correo");
                            await lookup();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "No se pudo solicitar");
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        {p.requested ? "Ya solicitado" : "Solicitar"}
                      </button>
                    ) : (
                      <p className="mt-3 text-xs font-medium text-rose-700">{p.lockReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-5 text-navy-900">
              <h3 className="font-display text-xl">Tus puntos</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {(data.pointsLedger ?? []).length === 0 && <li className="text-slate-500">Todavía no has ganado puntos.</li>}
                {(data.pointsLedger ?? []).map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{POINTS_ACTION_LABELS[p.action] || p.note || p.action}</span>
                    <b>{p.points > 0 ? `+${p.points}` : p.points}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
