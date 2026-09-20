import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Pencil, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { PageHeader, type HeaderAction } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import {
  cityError,
  cedulaError,
  catalogsForLevel,
  catalogAccessLabel,
  digitsOnly,
  firstError,
  formatCedula,
  formatPhoneRD,
  locationUrlError,
  personNameError,
  phoneError,
  LEVEL_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  POINTS_ACTION_LABELS,
  progressToNextLevel,
  type CatalogTier,
  type ClientLevel,
  type ClientStatus,
  type CreditStatus,
  type InstallmentStatus,
  type PaymentFrequency,
  type PointsAction,
} from "@hogarplus/shared";
import { CreditBadge, InstallmentBadge, LevelBadge } from "../components/Badges";

type NextInstallment = { dueDate: string; amount: number; number: number; status: InstallmentStatus };

type ActiveCredit = {
  id: string;
  startDate: string;
  balance: number;
  weeklyQuota: number;
  weeks: number;
  frequency: PaymentFrequency;
  downPayment: number;
  product: { name: string };
  installments: NextInstallment[];
};

type Client = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  city?: string;
  address?: string | null;
  locationUrl?: string | null;
  notes?: string | null;
  routeId?: string | null;
  route?: { id: string; name: string; area?: string | null } | null;
  status: ClientStatus;
  points: number;
  level: ClientLevel;
  affiliationPaid: boolean;
  createdAt: string;
  _count?: { credits: number };
  credits?: ActiveCredit[];
};

function nextDue(credits?: ActiveCredit[]) {
  const open = credits?.[0]?.installments?.[0];
  return open ?? null;
}

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
    onSuccess: (res) => {
      const hasCredit = Boolean((res.data as { credit?: unknown } | undefined)?.credit);
      toast.success(hasCredit ? "Cliente creado y producto entregado" : "Cliente creado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Ficha completa: inicio, próxima cuota, saldo y ubicación"
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
        headers={["Cliente", "Contacto", "Inicio", "Próxima cuota", "Saldo", "Ubicación"]}
      >
        {rows.map((c) => {
          const credit = c.credits?.[0];
          const due = nextDue(c.credits);
          return (
            <tr key={c.id} className="border-t hover:bg-slate-50">
              <td className="px-5 py-3.5">
                <Link className="font-semibold text-navy-800" to={`/clientes/${c.id}`}>
                  {c.firstName} {c.lastName}
                </Link>
                <div className="text-xs text-slate-500">{c.code} · {formatCedula(c.documentId)}</div>
                <div className="mt-1"><LevelBadge level={c.level} /></div>
              </td>
              <td className="px-5 py-3.5">
                {formatPhoneRD(c.phone)}
                <div className="text-xs text-slate-500">{c.city}</div>
              </td>
              <td className="px-5 py-3.5">{credit ? formatDate(credit.startDate) : "—"}</td>
              <td className="px-5 py-3.5">
                {due ? (
                  <>
                    {formatDate(due.dueDate)}
                    <div className="text-xs text-slate-500">{money(due.amount)}</div>
                  </>
                ) : "—"}
              </td>
              <td className="px-5 py-3.5 font-semibold">{credit ? money(credit.balance) : "—"}</td>
              <td className="px-5 py-3.5">
                {c.locationUrl ? (
                  <a className="inline-flex items-center gap-1 font-semibold text-navy-800" href={c.locationUrl} target="_blank" rel="noreferrer">
                    <MapPin size={14} /> Ver mapa
                  </a>
                ) : "—"}
              </td>
            </tr>
          );
        })}
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
  initial,
}: {
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  affiliationFee: number;
  initial?: Partial<Client>;
}) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    documentId: initial?.documentId ?? "",
    phone: initial?.phone ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    locationUrl: initial?.locationUrl ?? "",
    notes: initial?.notes ?? "",
    routeId: initial?.routeId ?? initial?.route?.id ?? "",
    payAffiliation: true,
    affiliationMethod: "CASH",
    productId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      api<Array<{ id: string; name: string; price: number; catalogTier: CatalogTier }>>("/api/products?pageSize=100"),
    enabled: !editing,
  });
  const routes = useQuery({
    queryKey: ["routes"],
    queryFn: () => api<Array<{ id: string; name: string; area?: string | null }>>("/api/routes"),
  });
  const starterProducts = (products.data?.data ?? []).filter((p) => catalogsForLevel("INICIAL").includes(p.catalogTier));

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: "" }));
  };

  return (
    <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={onClose}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const next = {
            firstName: personNameError(form.firstName, "nombre") ?? "",
            lastName: personNameError(form.lastName, "apellido") ?? "",
            documentId: editing ? "" : cedulaError(form.documentId) ?? "",
            phone: phoneError(form.phone) ?? "",
            city: cityError(form.city) ?? "",
            locationUrl: locationUrlError(form.locationUrl) ?? "",
          };
          setErrors(next);
          const message = firstError(Object.values(next));
          if (message) {
            toast.error(message);
            return;
          }
          const payload: Record<string, unknown> = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: digitsOnly(form.phone),
            city: form.city.trim(),
            address: form.address.trim() || undefined,
            locationUrl: form.locationUrl.trim(),
            notes: form.notes.trim() || undefined,
            routeId: form.routeId,
          };
          if (!editing) {
            Object.assign(payload, {
              documentId: digitsOnly(form.documentId),
              payAffiliation: form.payAffiliation,
              affiliationMethod: form.affiliationMethod,
              productId: form.productId || undefined,
            });
          }
          onSave(payload);
        }}
      >
        <Field label="Nombre" hint={fieldHint("name")} error={errors.firstName}>
          <FormattedInput kind="name" required value={form.firstName} error={Boolean(errors.firstName)} onValue={(v) => set("firstName", v)} />
        </Field>
        <Field label="Apellido" hint={fieldHint("name")} error={errors.lastName}>
          <FormattedInput kind="name" required value={form.lastName} error={Boolean(errors.lastName)} onValue={(v) => set("lastName", v)} />
        </Field>
        {!editing && (
          <Field label="Cédula" hint={fieldHint("cedula")} error={errors.documentId}>
            <FormattedInput kind="cedula" required value={form.documentId} error={Boolean(errors.documentId)} onValue={(v) => set("documentId", v)} />
          </Field>
        )}
        <Field label="Teléfono" hint={fieldHint("phone")} error={errors.phone}>
          <FormattedInput kind="phone" required value={form.phone} error={Boolean(errors.phone)} onValue={(v) => set("phone", v)} />
        </Field>
        <Field label="Ciudad" hint={fieldHint("city")} error={errors.city}>
          <FormattedInput kind="city" value={form.city} error={Boolean(errors.city)} onValue={(v) => set("city", v)} />
        </Field>
        <Field label="Dirección">
          <FormattedInput kind="text" value={form.address} onValue={(v) => set("address", v)} placeholder="Calle, sector, casa" />
        </Field>
        <Field label="Link de ubicación" hint={fieldHint("url")} error={errors.locationUrl}>
          <FormattedInput kind="url" value={form.locationUrl} error={Boolean(errors.locationUrl)} onValue={(v) => set("locationUrl", v)} />
        </Field>
        <Field label="Ruta de cobro">
          <select className="input" value={form.routeId} onChange={(e) => set("routeId", e.target.value)}>
            <option value="">Sin ruta</option>
            {(routes.data?.data ?? []).map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}{route.area ? ` · ${route.area}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Nota">
            <FormattedInput kind="text" value={form.notes} onValue={(v) => set("notes", v)} placeholder="Referencia, horario, etc." />
          </Field>
        </div>
        {!editing && (
          <>
            <Field label="Método afiliación">
              <select className="input" value={form.affiliationMethod} onChange={(e) => set("affiliationMethod", e.target.value)}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="DEPOSIT">Depósito</option>
              </select>
            </Field>
            <Field label="Producto (opcional)">
              <select
                className="input"
                value={form.productId}
                onChange={(e) => {
                  const productId = e.target.value;
                  setForm((f) => ({ ...f, productId, payAffiliation: productId ? true : f.payAffiliation }));
                }}
              >
                <option value="">Sin producto todavía</option>
                {starterProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · Bronce · {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="sm:col-span-2 text-xs text-slate-500">
              El cliente entra en Inicial y solo puede tomar productos Bronce. Con puntos sube a Plata y Oro.
            </p>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.payAffiliation}
                disabled={Boolean(form.productId)}
                onChange={(e) => set("payAffiliation", e.target.checked)}
              />
              Cobrar afiliación {money(affiliationFee)} ahora (20 puntos)
            </label>
          </>
        )}
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
  const [editing, setEditing] = useState(false);
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
  const approveOro = useMutation({
    mutationFn: () => api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify({ catalogApproved: true }) }),
    onSuccess: () => {
      toast.success("Catálogo Oro aprobado");
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Cliente actualizado");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = q.data?.data as {
    id: string;
    firstName: string;
    lastName: string;
    code: string;
    phone: string;
    documentId: string;
    city?: string;
    address?: string | null;
    locationUrl?: string | null;
    notes?: string | null;
    routeId?: string | null;
    route?: { id: string; name: string } | null;
    points: number;
    level: ClientLevel;
    affiliationPaid: boolean;
    catalogApproved: boolean;
    createdAt: string;
    credits: Array<{
      id: string;
      code: string;
      balance: number;
      status: CreditStatus;
      startDate: string;
      weeklyQuota: number;
      weeks: number;
      frequency: PaymentFrequency;
      downPayment: number;
      product: { name: string };
      installments: Array<{ id: string; number: number; dueDate: string; amount: number; paidAmount: number; status: InstallmentStatus }>;
    }>;
    pointsLedger: Array<{ id: string; action: PointsAction; points: number; note?: string }>;
  } | undefined;

  if (!c) return <p>Cargando...</p>;
  const progress = progressToNextLevel(c.points);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${c.firstName} ${c.lastName}`}
        description={`${c.code} · ${formatCedula(c.documentId)} · ${formatPhoneRD(c.phone)}`}
        icon={Users}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/clientes") },
          { label: "Editar", icon: Pencil, variant: "ghost", onClick: () => setEditing(true) },
          ...(!c.affiliationPaid
            ? ([{ label: "Cobrar afiliación", onClick: () => affiliate.mutate() }] satisfies HeaderAction[])
            : []),
          ...(!c.catalogApproved && (c.level === "PLATA" || c.level === "ORO")
            ? ([{ label: "Aprobar catálogo Oro", onClick: () => approveOro.mutate() }] satisfies HeaderAction[])
            : []),
          { label: "Nuevo crédito", href: `/creditos/nuevo?clientId=${id}` },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Nivel</p>
          <div className="mt-2 flex items-center gap-2">
            <LevelBadge level={c.level} />
            <b>{c.points} pts</b>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {progress.next
              ? `Faltan ${progress.remaining} pts para ${LEVEL_LABELS[progress.next]}`
              : "Nivel máximo Oro"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Contacto y ubicación</p>
          <p className="mt-2 text-sm">{formatPhoneRD(c.phone)}</p>
          <p className="text-sm text-slate-600">{[c.address, c.city].filter(Boolean).join(" · ") || "Sin dirección"}</p>
          {c.locationUrl ? (
            <a className="mt-2 inline-flex items-center gap-1 font-semibold text-navy-800" href={c.locationUrl} target="_blank" rel="noreferrer">
              <MapPin size={16} /> Abrir en Maps
            </a>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sin link de ubicación. Edita el cliente para pegarlo.</p>
          )}
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Afiliación</p>
          <p className="mt-2 font-semibold">{c.affiliationPaid ? "Pagada" : "Pendiente"}</p>
          <p className="mt-2 text-sm text-slate-600">Cliente desde {formatDate(c.createdAt)}</p>
          {c.route ? <p className="mt-1 text-sm text-slate-600">Ruta {c.route.name}</p> : null}
          {c.notes ? <p className="mt-2 text-sm text-slate-600">{c.notes}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-display text-xl">Productos y cuotas</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {c.credits.length === 0 && <li className="text-slate-500">Todavía no tiene productos entregados.</li>}
            {c.credits.map((cr) => {
              const open = cr.installments.find((inst) => inst.status !== "PAID");
              const remaining = cr.installments.filter((inst) => inst.status !== "PAID").length;
              return (
                <li key={cr.id} className="rounded-xl bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link className="font-semibold" to={`/creditos/${cr.id}`}>{cr.code} · {cr.product.name}</Link>
                    <CreditBadge status={cr.status} />
                  </div>
                  <p className="mt-1 text-slate-500">
                    Empezó {formatDate(cr.startDate)} · {PAYMENT_FREQUENCY_LABELS[cr.frequency ?? "WEEKLY"]} · {cr.weeks} cuotas
                  </p>
                  <p className="mt-1 text-slate-500">
                    Inicial {money(cr.downPayment ?? 0)} · Cuota {money(cr.weeklyQuota)} · Saldo {money(cr.balance)}
                  </p>
                  <p className="mt-1 font-medium text-navy-800">
                    {open
                      ? `Próxima cuota ${formatDate(open.dueDate)} · ${money(open.amount)} · faltan ${remaining}`
                      : "Sin cuotas pendientes"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cr.installments.slice(0, 8).map((inst) => (
                      <InstallmentBadge key={inst.id} status={inst.status} dueDate={inst.dueDate} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-xl">Puntos</h3>
          <p className="mt-1 text-sm text-slate-500">Catálogo: {catalogAccessLabel(c.level)}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {c.pointsLedger.length === 0 && <li className="text-slate-500">Aún no ha ganado puntos.</li>}
            {c.pointsLedger.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{POINTS_ACTION_LABELS[p.action] || p.note || p.action}</span>
                <b>{p.points > 0 ? `+${p.points}` : p.points}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {editing && (
        <ClientForm
          affiliationFee={0}
          initial={c}
          onClose={() => setEditing(false)}
          onSave={(body) => update.mutate(body)}
        />
      )}
    </div>
  );
}
