import { useState } from "react";
import { api, money } from "../lib/api";
import { Logo } from "../components/Logo";
import { LevelBadge, InstallmentBadge } from "../components/Badges";
import { CATEGORY_LABELS, type ClientLevel, type InstallmentStatus, type ProductCategory } from "@hogarplus/shared";

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
  catalog: Array<{ id: string; name: string; category: ProductCategory; catalogTier: string; price: number }>;
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
        <h1 className="font-display text-4xl">Consulta tu cuenta</h1>
        <p className="mt-2 text-slate-300">Saldo, puntos, catálogo disponible y próximos pagos.</p>
        <form
          className="mt-6 grid gap-3 rounded-2xl bg-navy-900 p-5 md:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              const res = await api<PortalData>("/api/portal/lookup", {
                method: "POST",
                body: JSON.stringify({ documentId, phone }),
              });
              setData(res.data);
            } catch (err) {
              setData(null);
              setError(err instanceof Error ? err.message : "No encontrado");
            }
          }}
        >
          <input className="input text-navy-900" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="Cédula" />
          <input className="input text-navy-900" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" />
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
                </div>
                <div className="flex items-center gap-3">
                  <LevelBadge level={data.client.level} />
                  <b>{data.client.points} puntos</b>
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
                      <InstallmentBadge status={i.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-white p-5 text-navy-900">
              <h3 className="font-display text-xl">Catálogo de tu nivel</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {data.catalog.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">{CATEGORY_LABELS[p.category]} · Cat {p.catalogTier}</p>
                    <p className="font-semibold">{p.name}</p>
                    <p>{money(p.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
