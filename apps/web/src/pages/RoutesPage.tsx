import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MapPinned, Plus } from "lucide-react";
import { api } from "../lib/api";
import { Field, FormattedInput, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { formatPhoneRD } from "@hogarplus/shared";

type RouteRow = {
  id: string;
  name: string;
  area?: string | null;
  notes?: string | null;
  active: boolean;
  _count?: { clients: number };
};

type RouteDetail = RouteRow & {
  clients: Array<{
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    phone: string;
    city?: string | null;
    address?: string | null;
    locationUrl?: string | null;
  }>;
};

type ClientOption = { id: string; firstName: string; lastName: string; code: string; routeId?: string | null };

export function RoutesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", area: "", notes: "" });
  const [pick, setPick] = useState<string[]>([]);

  const list = useQuery({
    queryKey: ["routes"],
    queryFn: () => api<RouteRow[]>("/api/routes"),
  });
  const detail = useQuery({
    queryKey: ["route", selected],
    queryFn: () => api<RouteDetail>(`/api/routes/${selected}`),
    enabled: Boolean(selected),
  });
  const clients = useQuery({
    queryKey: ["clients", "routes"],
    queryFn: () => api<ClientOption[]>("/api/clients?pageSize=100"),
  });

  const create = useMutation({
    mutationFn: () => api("/api/routes", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Ruta creada");
      qc.invalidateQueries({ queryKey: ["routes"] });
      setOpen(false);
      setForm({ name: "", area: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: () =>
      api(`/api/routes/${selected}/clients`, { method: "POST", body: JSON.stringify({ clientIds: pick }) }),
    onSuccess: () => {
      toast.success("Clientes enlazados a la ruta");
      setPick([]);
      qc.invalidateQueries({ queryKey: ["route", selected] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = list.data?.data ?? [];
  const route = detail.data?.data;
  const available = (clients.data?.data ?? []).filter((c) => c.routeId !== selected);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rutas"
        description="Crea una ruta (Villamella, Ensanche, etc.) y enlaza los clientes de esa zona"
        icon={MapPinned}
        actions={[{ label: "Nueva ruta", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="panel overflow-hidden">
          {rows.length === 0 && <p className="p-5 text-sm text-slate-500">Todavía no hay rutas.</p>}
          {rows.map((item) => (
            <button
              key={item.id}
              className={`w-full border-b px-4 py-3 text-left ${selected === item.id ? "bg-gold-50" : "hover:bg-slate-50"}`}
              onClick={() => setSelected(item.id)}
            >
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-slate-500">{item.area || "Sin zona"} · {item._count?.clients ?? 0} clientes</p>
            </button>
          ))}
        </div>
        <div className="panel p-5">
          {!route && <p className="text-sm text-slate-500">Elige una ruta para ver y enlazar clientes.</p>}
          {route && (
            <>
              <h2 className="font-display text-2xl">{route.name}</h2>
              <p className="text-sm text-slate-500">{route.area || "Sin zona"} {route.notes ? `· ${route.notes}` : ""}</p>
              <ul className="mt-4 space-y-2">
                {route.clients.length === 0 && <li className="text-sm text-slate-500">Esta ruta no tiene clientes todavía.</li>}
                {route.clients.map((c) => (
                  <li key={c.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <Link className="font-semibold" to={`/clientes/${c.id}`}>{c.firstName} {c.lastName}</Link>
                    <p className="text-slate-500">{c.code} · {formatPhoneRD(c.phone)} · {c.city || "Sin ciudad"}</p>
                    {c.locationUrl && (
                      <a className="text-navy-800" href={c.locationUrl} target="_blank" rel="noreferrer">Ver mapa</a>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Enlazar clientes</p>
                <select
                  className="input"
                  multiple
                  size={6}
                  value={pick}
                  onChange={(e) => setPick(Array.from(e.target.selectedOptions, (option) => option.value))}
                >
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} · {c.code}
                    </option>
                  ))}
                </select>
                <button className="btn-primary mt-3" disabled={pick.length === 0} onClick={() => assign.mutate()}>
                  Agregar a esta ruta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {open && (
        <Modal title="Nueva ruta" onClose={() => setOpen(false)}>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.name.trim().length < 2) {
                toast.error("Ponle un nombre a la ruta");
                return;
              }
              create.mutate();
            }}
          >
            <Field label="Nombre">
              <FormattedInput kind="city" required value={form.name} onValue={(v) => setForm({ ...form, name: v })} placeholder="Villamella" />
            </Field>
            <Field label="Zona o sector">
              <FormattedInput kind="city" value={form.area} onValue={(v) => setForm({ ...form, area: v })} placeholder="Santo Domingo Oeste" />
            </Field>
            <Field label="Nota">
              <FormattedInput kind="text" value={form.notes} onValue={(v) => setForm({ ...form, notes: v })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
