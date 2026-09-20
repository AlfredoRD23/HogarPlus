import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api, money } from "../lib/api";
import { LevelBadge } from "../components/Badges";
import { Field, Modal } from "../components/Form";
import { PageHeader, type HeaderAction } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import type { ClientLevel, ClientStatus } from "@hogarplus/shared";

type Client = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  city?: string;
  status: ClientStatus;
  points: number;
  level: ClientLevel;
  affiliationPaid: boolean;
  _count?: { credits: number };
};

export function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["clients", search],
    queryFn: () => api<Client[]>(`/api/clients?search=${encodeURIComponent(search)}&pageSize=50`),
  });

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ affiliationFee: number }>("/api/settings"),
  });
  const rows = query.data?.data ?? [];

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api("/api/clients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Cliente creado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Afiliación, puntos, nivel e historial de crédito"
        icon={Users}
        searchPlaceholder="Buscar por nombre, cédula o código"
        searchValue={search}
        onSearchChange={setSearch}
        actions={[{ label: "Nuevo cliente", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <DataTable
        title="Lista de clientes"
        count={query.data?.meta?.total ?? rows.length}
        loading={query.isLoading}
        rows={rows.length}
        emptyTitle="Sin clientes"
        emptyDescription="Crea el primer cliente para comenzar la cartera."
        emptyAction={<button className="btn-gold" onClick={() => setOpen(true)}>Nuevo cliente</button>}
        headers={["Cliente", "Contacto", "Nivel", "Puntos", "Afiliación", "Créditos"]}
      >
        {rows.map((c) => (
          <tr key={c.id} className="border-t hover:bg-slate-50">
            <td className="px-4 py-3">
              <Link className="font-semibold text-navy-800" to={`/clientes/${c.id}`}>
                {c.firstName} {c.lastName}
              </Link>
              <div className="text-xs text-slate-500">{c.code} · {c.documentId}</div>
            </td>
            <td className="px-4 py-3">{c.phone}<div className="text-xs text-slate-500">{c.city}</div></td>
            <td className="px-4 py-3"><LevelBadge level={c.level} /></td>
            <td className="px-4 py-3 font-semibold">{c.points}</td>
            <td className="px-4 py-3">{c.affiliationPaid ? "Pagada" : "Pendiente"}</td>
            <td className="px-4 py-3">{c._count?.credits ?? 0}</td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <ClientForm
          affiliationFee={settings.data?.data.affiliationFee ?? 0}
          onClose={() => setOpen(false)}
          onSave={(body) => create.mutate(body)}
        />
      )}
    </div>
  );
}

function ClientForm({
  onClose,
  onSave,
  affiliationFee,
}: {
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  affiliationFee: number;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    documentId: "",
    phone: "",
    city: "",
    payAffiliation: true,
    affiliationMethod: "CASH",
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Nombre"><input className="input" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="Apellido"><input className="input" required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
        <Field label="Cédula"><input className="input" required value={form.documentId} onChange={(e) => set("documentId", e.target.value)} /></Field>
        <Field label="Teléfono"><input className="input" required value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Ciudad"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Método afiliación">
          <select className="input" value={form.affiliationMethod} onChange={(e) => set("affiliationMethod", e.target.value)}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="DEPOSIT">Depósito</option>
          </select>
        </Field>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.payAffiliation} onChange={(e) => set("payAffiliation", e.target.checked)} />
          Cobrar afiliación {money(affiliationFee)} ahora (20 puntos)
        </label>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export function ClientDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client", id],
    queryFn: () => api<Record<string, unknown>>(`/api/clients/${id}`),
    enabled: Boolean(id),
  });
  const affiliate = useMutation({
    mutationFn: () => api(`/api/clients/${id}/affiliation`, { method: "POST", body: JSON.stringify({ method: "CASH" }) }),
    onSuccess: () => {
      toast.success("Afiliación cobrada");
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = q.data?.data as {
    firstName: string;
    lastName: string;
    code: string;
    phone: string;
    documentId: string;
    points: number;
    level: ClientLevel;
    affiliationPaid: boolean;
    credits: Array<{ id: string; code: string; balance: number; status: string; product: { name: string } }>;
    pointsLedger: Array<{ id: string; action: string; points: number; note?: string }>;
  } | undefined;

  if (!c) return <p>Cargando...</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${c.firstName} ${c.lastName}`}
        description={`${c.code} · ${c.documentId} · ${c.phone}`}
        icon={Users}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/clientes") },
          ...(!c.affiliationPaid
            ? ([{ label: "Cobrar afiliación", onClick: () => affiliate.mutate() }] satisfies HeaderAction[])
            : []),
          { label: "Nuevo crédito", href: `/creditos/nuevo?clientId=${id}` },
        ]}
      />
      <div className="flex items-center gap-3">
        <LevelBadge level={c.level} />
        <span className="font-semibold">{c.points} pts</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-display text-xl">Créditos</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {c.credits.map((cr) => (
              <li key={cr.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <Link to={`/creditos/${cr.id}`}>{cr.code} · {cr.product.name}</Link>
                <span>{cr.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-xl">Puntos</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {c.pointsLedger.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.note || p.action}</span>
                <b>{p.points}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
