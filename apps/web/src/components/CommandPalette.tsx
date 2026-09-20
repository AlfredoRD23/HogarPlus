import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api, money } from "../lib/api";
import { flatNav } from "../lib/navigation";
import { useAuth } from "../auth/AuthContext";

type SearchData = {
  clients: Array<{ id: string; code: string; firstName: string; lastName: string }>;
  products: Array<{ id: string; sku: string; name: string; price: number }>;
  credits: Array<{ id: string; code: string; product: { name: string }; client: { firstName: string; lastName: string } }>;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchData>({ clients: [], products: [], credits: [] });
  const pages = user ? flatNav(user.role) : [];

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (q.trim().length < 2) {
        setData({ clients: [], products: [], credits: [] });
        return;
      }
      api<SearchData>(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((res) => setData(res.data))
        .catch(() => setData({ clients: [], products: [], credits: [] }));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    setQ("");
    navigate(path);
  };

  const filteredPages = pages.filter(
    (p) =>
      !q ||
      p.label.toLowerCase().includes(q.toLowerCase()) ||
      p.keywords.some((k) => k.includes(q.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-[70] bg-navy-950/50 p-4" onClick={onClose}>
      <div className="mx-auto mt-[10vh] max-w-xl overflow-hidden rounded-2xl bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            className="w-full py-4 pl-12 pr-4 text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar clientes, productos, créditos o ir a una página"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-[60vh] overflow-auto p-2 text-sm">
          {filteredPages.length > 0 && (
            <Section title="Páginas">
              {filteredPages.slice(0, 6).map((p) => (
                <button key={p.id} className="palette-row" onClick={() => go(p.to)}>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.description}</p>
                </button>
              ))}
            </Section>
          )}
          {data.clients.length > 0 && (
            <Section title="Clientes">
              {data.clients.map((c) => (
                <button key={c.id} className="palette-row" onClick={() => go(`/clientes/${c.id}`)}>
                  {c.firstName} {c.lastName} <span className="text-slate-400">{c.code}</span>
                </button>
              ))}
            </Section>
          )}
          {data.credits.length > 0 && (
            <Section title="Créditos">
              {data.credits.map((c) => (
                <button key={c.id} className="palette-row" onClick={() => go(`/creditos/${c.id}`)}>
                  {c.code} · {c.product.name} · {c.client.firstName} {c.client.lastName}
                </button>
              ))}
            </Section>
          )}
          {data.products.length > 0 && (
            <Section title="Productos">
              {data.products.map((p) => (
                <button key={p.id} className="palette-row" onClick={() => go("/productos")}>
                  {p.name} · {p.sku} · {money(p.price)}
                </button>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}
