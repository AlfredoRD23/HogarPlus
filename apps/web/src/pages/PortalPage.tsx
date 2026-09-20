import { useState } from "react";
import { api, money } from "../lib/api";
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
  catalog: Array<{ id: string; name: string; category: ProductCategory; catalogTier: CatalogTier; price: number }>;
  pointsLedger: Array<{ id: string; action: PointsAction; points: number; note?: string }>;
};

export function PortalPage() {
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <a href="/" className="text-sm text-gold-300">Inicio</a>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="font-display text-4xl">Soy cliente</h1>
        <p className="mt-2 text-slate-300">Mira tu nivel, puntos, productos y si tus cuotas están pendientes o atrasadas.</p>
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
              const res = await api<PortalData>("/api/portal/lookup", {
                method: "POST",
                body: JSON.stringify({ documentId: digitsOnly(documentId), phone: digitsOnly(phone) }),
              });
              setData(res.data);
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
                    Catálogo abierto: {catalogAccessLabel(data.client.level)}
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
                </div>
              </div>
            </div>
            {data.credits.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white p-5 text-navy-900">
                <div className="flex justify-between">
                  <h3 className="font-display text-xl">{c.product.name}</h3>
                  <span>Saldo {money(c.balance)}</span>
                </div>
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
            ))}
            <div className="rounded-2xl bg-white p-5 text-navy-900">
              <h3 className="font-display text-xl">Productos de tu categoría</h3>
              <p className="mt-1 text-sm text-slate-500">Solo ves Bronce, Plata u Oro según tu nivel.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {data.catalog.length === 0 && <p className="text-sm text-slate-500">No hay productos abiertos para tu nivel todavía.</p>}
                {data.catalog.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">{CATEGORY_LABELS[p.category]}</p>
                      <CatalogBadge tier={p.catalogTier} />
                    </div>
                    <p className="font-semibold">{p.name}</p>
                    <p>{money(p.price)}</p>
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
