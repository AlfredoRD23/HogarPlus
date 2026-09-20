import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Pencil, Plus, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { debtFacts, debtNotes } from "../lib/debt";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoModal } from "../components/InfoModal";
import { ImagePicker } from "../components/ImagePicker";
import { ReferClientForm } from "../components/ReferClientForm";
import { RowActions } from "../components/RowActions";
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
  emailError,
  LEVEL_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  POINTS_ACTION_LABELS,
  POINTS_RULES,
  progressToNextLevel,
  REFERRAL_STATUS_LABELS,
  type CatalogTier,
  type ClientLevel,
  type ClientStatus,
  type CreditStatus,
  type InstallmentStatus,
  type OutstandingCredit,
  type PaymentFrequency,
  type PointsAction,
  type ReferralStatus,
} from "@hogarplus/shared";
import { CreditBadge, InstallmentBadge, LevelBadge } from "../components/Badges";

type NextInstallment = { dueDate: string; amount: number; number: number; status: InstallmentStatus };

type ActiveCredit = {
  id: string;
  code?: string;
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
  email?: string | null;
  city?: string;
  address?: string | null;
  locationUrl?: string | null;
  notes?: string | null;
  referenceName?: string | null;
  referencePhone?: string | null;
  routeId?: string | null;
  route?: { id: string; name: string; area?: string | null } | null;
  referredBy?: { id: string; code: string; firstName: string; lastName: string } | null;
  referredById?: string | null;
  status: ClientStatus;
  points: number;
  level: ClientLevel;
  affiliationPaid: boolean;
  createdAt: string;
  _count?: { credits: number };
  credits?: ActiveCredit[];
  images?: Array<{ id: string; path: string }>;
};

async function uploadClientImages(clientId: string, files: File[]) {
  if (files.length === 0) return;
  const body = new FormData();
  files.forEach((file) => body.append("images", file));
  await api(`/api/clients/${clientId}/images`, { method: "POST", body });
}

function nextDue(credits?: ActiveCredit[]) {
  const open = credits?.[0]?.installments?.[0];
  return open ?? null;
}

export function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirm, setConfirm] = useState<{ client: Client; activate: boolean } | null>(null);
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
    mutationFn: async ({ body, files }: { body: Record<string, unknown>; files: File[] }) => {
      const created = await api<{ id: string; credit?: unknown }>("/api/clients", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await uploadClientImages(created.data.id, files);
      return created;
    },
    onSuccess: (res) => {
      const hasCredit = Boolean((res.data as { credit?: unknown } | undefined)?.credit);
      toast.success(hasCredit ? "Cliente creado y producto entregado" : "Cliente creado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateRow = useMutation({
    mutationFn: async ({ id, body, files }: { id: string; body: Record<string, unknown>; files: File[] }) => {
      await api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await uploadClientImages(id, files);
    },
    onSuccess: () => {
      toast.success("Cliente actualizado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClientStatus }) =>
      api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success(confirm?.activate ? "Cliente reactivado" : "Cliente desactivado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Ficha completa: inicio, próxima cuota, saldo y ubicación"
        icon={Users}
        searchPlaceholder="Buscar por nombre, cédula, código o correo"
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
        headers={["Cliente", "Contacto", "Referencia", "Inicio", "Próxima cuota", "Saldo", "Acciones"]}
        mobile={rows.map((c) => {
          const credit = c.credits?.[0];
          const due = nextDue(c.credits);
          const photo = c.images?.[0];
          return (
            <article key={c.id} className={`px-4 py-4 ${c.status !== "ACTIVE" ? "opacity-60" : ""}`}>
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                {photo ? (
                  <img src={mediaUrl(photo.path)} alt="" className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-cover object-top" />
                ) : (
                  <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-lg font-bold text-gold-300">
                    {c.firstName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <Link className="block truncate font-semibold text-navy-800" to={`/clientes/${c.id}`}>
                    {c.firstName} {c.lastName}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{c.code} · {formatCedula(c.documentId)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <LevelBadge level={c.level} />
                    {c.status !== "ACTIVE" ? <span className="text-[11px] font-bold uppercase text-rose-700">Inactivo</span> : null}
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Contacto</dt>
                  <dd className="mt-0.5">{formatPhoneRD(c.phone)}</dd>
                  <dd className="truncate text-xs text-slate-500">{c.email || c.city || "—"}</dd>
                  {c.email && c.city ? <dd className="text-xs text-slate-500">{c.city}</dd> : null}
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Referencia</dt>
                  <dd className="mt-0.5">{c.referenceName || "—"}</dd>
                  {c.referencePhone ? <dd className="text-xs text-slate-500">{formatPhoneRD(c.referencePhone)}</dd> : null}
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Próxima cuota</dt>
                  <dd className="mt-0.5">{due ? formatDate(due.dueDate) : "—"}</dd>
                  {due ? <dd className="text-xs text-slate-500">{money(due.amount)}</dd> : null}
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Saldo</dt>
                  <dd className="mt-0.5 font-semibold">{credit ? money(credit.balance) : "—"}</dd>
                  <dd className="text-xs text-slate-500">{credit ? formatDate(credit.startDate) : "Sin crédito"}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <RowActions
                  active={c.status === "ACTIVE"}
                  onEdit={() => setEditing(c)}
                  onDeactivate={() => setConfirm({ client: c, activate: false })}
                  onActivate={() => setConfirm({ client: c, activate: true })}
                />
              </div>
            </article>
          );
        })}
      >
        {rows.map((c) => {
          const credit = c.credits?.[0];
          const due = nextDue(c.credits);
          const photo = c.images?.[0];
          return (
            <tr key={c.id} className={`border-t hover:bg-slate-50 ${c.status !== "ACTIVE" ? "opacity-60" : ""}`}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {photo ? (
                    <img src={mediaUrl(photo.path)} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-gold-300">
                      {c.firstName.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <Link className="font-semibold text-navy-800" to={`/clientes/${c.id}`}>
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="text-xs text-slate-500">{c.code} · {formatCedula(c.documentId)}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <LevelBadge level={c.level} />
                      {c.status !== "ACTIVE" ? <span className="text-[11px] font-bold uppercase text-rose-700">Inactivo</span> : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                {formatPhoneRD(c.phone)}
                {c.email ? <div className="truncate text-xs text-slate-500">{c.email}</div> : null}
                <div className="text-xs text-slate-500">{c.city}</div>
              </td>
              <td className="px-5 py-3.5">
                {c.referenceName ? (
                  <>
                    {c.referenceName}
                    <div className="text-xs text-slate-500">{formatPhoneRD(c.referencePhone ?? "")}</div>
                  </>
                ) : "—"}
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
                <RowActions
                  active={c.status === "ACTIVE"}
                  onEdit={() => setEditing(c)}
                  onDeactivate={() => setConfirm({ client: c, activate: false })}
                  onActivate={() => setConfirm({ client: c, activate: true })}
                />
              </td>
            </tr>
          );
        })}
      </DataTable>
      {open && (
        <ClientForm
          affiliationFee={settings.data?.data.affiliationFee ?? 0}
          onClose={() => setOpen(false)}
          onSave={(body, files) => create.mutate({ body, files })}
        />
      )}
      {editing && (
        <ClientForm
          affiliationFee={0}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(body, files) => updateRow.mutate({ id: editing.id, body, files })}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.activate ? "Reactivar cliente" : "Desactivar cliente"}
          message={confirm.activate ? "Vas a reactivar a" : "Vas a desactivar a"}
          itemName={`${confirm.client.firstName} ${confirm.client.lastName}`}
          confirmText={confirm.activate ? "Reactivar" : "Desactivar"}
          loadingText={confirm.activate ? "Reactivando..." : "Desactivando..."}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            confirm.activate
              ? [
                  "Volverá a aparecer en el portal y en cobranza",
                  "Se le podrán entregar productos otra vez",
                  "Créditos, cuotas y pagos se quedan igual",
                ]
              : [
                  "No se borra: créditos, cuotas y pagos se quedan",
                  "No podrá consultar el portal",
                  "No se le entregan productos nuevos",
                  "Puedes reactivarlo cuando quieras",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            toggle.mutate({
              id: confirm.client.id,
              status: confirm.activate ? "ACTIVE" : "INACTIVE",
            })
          }
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
  onSave: (body: Record<string, unknown>, files: File[]) => void;
  affiliationFee: number;
  initial?: Partial<Client>;
}) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    documentId: initial?.documentId ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    locationUrl: initial?.locationUrl ?? "",
    notes: initial?.notes ?? "",
    referenceName: initial?.referenceName ?? "",
    referencePhone: initial?.referencePhone ?? "",
    routeId: initial?.routeId ?? initial?.route?.id ?? "",
    referredById: initial?.referredById ?? initial?.referredBy?.id ?? "",
    affiliationMethod: "CASH",
    productId: "",
  });
  const [pending, setPending] = useState<File[]>([]);
  const [savedImages, setSavedImages] = useState(initial?.images ?? []);
  const [removingImage, setRemovingImage] = useState<{ id: string; path: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      api<Array<{ id: string; name: string; price: number; catalogTier: CatalogTier }>>("/api/products?pageSize=100"),
    enabled: !editing,
  });
  const referrers = useQuery({
    queryKey: ["clients", "referrers"],
    queryFn: () => api<Array<{ id: string; firstName: string; lastName: string; code: string }>>("/api/clients?pageSize=100"),
    enabled: !editing,
  });
  const routes = useQuery({
    queryKey: ["routes"],
    queryFn: () => api<Array<{ id: string; name: string; area?: string | null }>>("/api/routes"),
  });
  const matchPhone = digitsOnly(form.phone);
  const match = useQuery({
    queryKey: ["referral-match", matchPhone],
    queryFn: () =>
      api<{
        firstName: string;
        lastName: string;
        referrer: { id: string; firstName: string; lastName: string; code: string };
      } | null>(`/api/referrals/match?phone=${matchPhone}`),
    enabled: !editing && matchPhone.length === 10,
  });
  const starterProducts = (products.data?.data ?? []).filter((p) => catalogsForLevel("INICIAL").includes(p.catalogTier));

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => ({ ...current, [k]: "" }));
  };

  return (
    <Modal title={editing ? "Editar cliente" : "Nuevo cliente"} onClose={onClose} size="lg">
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
            email: emailError(form.email, false) ?? "",
            city: cityError(form.city) ?? "",
            locationUrl: locationUrlError(form.locationUrl) ?? "",
            referenceName: form.referenceName || form.referencePhone ? personNameError(form.referenceName, "nombre de la referencia") ?? "" : "",
            referencePhone: form.referenceName || form.referencePhone ? phoneError(form.referencePhone) ?? "" : "",
            productId: !editing && !form.productId ? "Selecciona un producto Bronce" : "",
          };
          setErrors(next);
          if (firstError(Object.values(next))) return;
          const payload: Record<string, unknown> = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: digitsOnly(form.phone),
            email: form.email.trim(),
            city: form.city.trim(),
            address: form.address.trim() || undefined,
            locationUrl: form.locationUrl.trim(),
            notes: form.notes.trim() || undefined,
            referenceName: form.referenceName.trim(),
            referencePhone: digitsOnly(form.referencePhone),
            routeId: form.routeId,
          };
          if (!editing) {
            Object.assign(payload, {
              documentId: digitsOnly(form.documentId),
              payAffiliation: true,
              affiliationMethod: form.affiliationMethod,
              productId: form.productId,
              referredById: form.referredById || match.data?.data?.referrer.id,
            });
          }
          onSave(payload, pending);
        }}
      >
        <p className="sm:col-span-2 text-xs text-slate-400">Los campos con * son obligatorios.</p>
        <Field label="Nombre" hint={fieldHint("name")} error={errors.firstName} required>
          <FormattedInput kind="name" required value={form.firstName} error={Boolean(errors.firstName)} onValue={(v) => set("firstName", v)} />
        </Field>
        <Field label="Apellido" hint={fieldHint("name")} error={errors.lastName} required>
          <FormattedInput kind="name" required value={form.lastName} error={Boolean(errors.lastName)} onValue={(v) => set("lastName", v)} />
        </Field>
        {!editing && (
          <Field label="Cédula" hint={fieldHint("cedula")} error={errors.documentId} required>
            <FormattedInput kind="cedula" required value={form.documentId} error={Boolean(errors.documentId)} onValue={(v) => set("documentId", v)} />
          </Field>
        )}
        <Field label="Teléfono" hint={fieldHint("phone")} error={errors.phone} required>
          <FormattedInput kind="phone" required value={form.phone} error={Boolean(errors.phone)} onValue={(v) => set("phone", v)} />
        </Field>
        <Field label="Correo" hint="Para avisos de pedido, cuotas y plantillas" error={errors.email}>
          <FormattedInput kind="email" value={form.email} error={Boolean(errors.email)} onValue={(v) => set("email", v)} placeholder="correo@dominio.com" />
        </Field>
        <Field label="Ciudad" hint={fieldHint("city")} error={errors.city} required>
          <FormattedInput kind="city" required value={form.city} error={Boolean(errors.city)} onValue={(v) => set("city", v)} />
        </Field>
        <Field label="Dirección">
          <FormattedInput kind="text" value={form.address} onValue={(v) => set("address", v)} placeholder="Calle, sector, casa" />
        </Field>
        <Field label="Link de ubicación" hint={fieldHint("url")} error={errors.locationUrl}>
          <FormattedInput kind="url" value={form.locationUrl} error={Boolean(errors.locationUrl)} onValue={(v) => set("locationUrl", v)} />
        </Field>
        {!editing && (
          <>
            <Field label="Producto inicial" hint="El cliente entra en Inicial y solo puede tomar Bronce" error={errors.productId} required>
              <select
                className={`input ${errors.productId ? "input-error" : ""}`}
                required
                value={form.productId}
                onChange={(e) => set("productId", e.target.value)}
              >
                <option value="">{starterProducts.length ? "Seleccione un producto Bronce" : "No hay productos Bronce"}</option>
                {starterProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Método de afiliación" required>
              <select className="input" value={form.affiliationMethod} onChange={(e) => set("affiliationMethod", e.target.value)}>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="DEPOSIT">Depósito</option>
              </select>
            </Field>
            {products.isFetched && starterProducts.length === 0 ? (
              <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                No hay productos Bronce activos. Crea uno en Catálogo antes de registrar el cliente.
              </p>
            ) : (
              <p className="sm:col-span-2 text-xs text-slate-500">
                Al guardar se cobra la afiliación {money(affiliationFee)} y se entrega el producto. Con puntos sube a Plata y Oro.
              </p>
            )}
          </>
        )}
        <Field label="Nombre de la referencia personal" hint="Contacto de confianza. No es un cliente referido." error={errors.referenceName}>
          <FormattedInput kind="name" value={form.referenceName} error={Boolean(errors.referenceName)} onValue={(v) => set("referenceName", v)} placeholder="Persona de contacto" />
        </Field>
        <Field label="Teléfono de la referencia personal" hint={fieldHint("phone")} error={errors.referencePhone}>
          <FormattedInput kind="phone" value={form.referencePhone} error={Boolean(errors.referencePhone)} onValue={(v) => set("referencePhone", v)} />
        </Field>
        {!editing && (
          <div className="sm:col-span-2">
            <Field label="Cliente que lo trajo">
              <select className="input" value={form.referredById} onChange={(e) => set("referredById", e.target.value)}>
                <option value="">Nadie / se detecta por teléfono referido</option>
                {(referrers.data?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName} · {item.code}
                  </option>
                ))}
              </select>
            </Field>
            {match.data?.data ? (
              <p className="mt-2 rounded-xl bg-gold-50 p-3 text-sm">
                Este teléfono lo refirió <b>{match.data.data.referrer.firstName} {match.data.data.referrer.lastName}</b> ({match.data.data.referrer.code}) como {match.data.data.firstName} {match.data.data.lastName}. Al guardar se valida y se le suman {POINTS_RULES.REFERRAL} puntos.
              </p>
            ) : null}
          </div>
        )}
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
            <FormattedInput kind="text" value={form.notes} onValue={(v) => set("notes", v)} placeholder="Horario, portón, etc." />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ImagePicker
            saved={savedImages}
            pending={pending}
            onAddFiles={(files) => setPending((current) => [...current, ...files])}
            onRemovePending={(index) => setPending((current) => current.filter((_, i) => i !== index))}
            onRemoveSaved={
              initial?.id
                ? (imageId) => {
                    const image = savedImages.find((item) => item.id === imageId);
                    if (image) {
                      setRemoveError(undefined);
                      setRemovingImage(image);
                    }
                  }
                : undefined
            }
          />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!editing && (products.isFetched && starterProducts.length === 0)}>
            Guardar
          </button>
        </div>
      </form>
      {removingImage && initial?.id && (
        <ConfirmModal
          title="Quitar foto"
          message="Vas a quitar esta foto de"
          itemName={`${initial.firstName ?? "este cliente"} ${initial.lastName ?? ""}`.trim()}
          confirmText="Quitar foto"
          loadingText="Quitando..."
          loading={removing}
          error={removeError}
          irreversible
          consequences={[
            "La foto se borra del cliente",
            "No se puede recuperar después",
            "El resto de datos del cliente se quedan",
          ]}
          onClose={() => {
            if (!removing) setRemovingImage(null);
          }}
          onConfirm={async () => {
            setRemoving(true);
            setRemoveError(undefined);
            try {
              await api(`/api/clients/${initial.id}/images/${removingImage.id}`, { method: "DELETE" });
              setSavedImages((current) => current.filter((item) => item.id !== removingImage.id));
              setRemovingImage(null);
              toast.success("Foto quitada");
            } catch (error) {
              setRemoveError(error instanceof Error ? error.message : "No se pudo quitar la foto");
            } finally {
              setRemoving(false);
            }
          }}
        />
      )}
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
    mutationFn: async ({ body, files }: { body: Record<string, unknown>; files: File[] }) => {
      await api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await uploadClientImages(id, files);
    },
    onSuccess: () => {
      toast.success("Cliente actualizado");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [confirmOff, setConfirmOff] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [referError, setReferError] = useState<string | undefined>();
  const [debt, setDebt] = useState<OutstandingCredit | null>(null);
  const toggle = useMutation({
    mutationFn: (status: ClientStatus) => api(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setConfirmOff(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const refer = useMutation({
    mutationFn: (body: { firstName: string; lastName: string; phone: string }) =>
      api(`/api/clients/${id}/referrals`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Referido enviado. El equipo recibe aviso para entrar a esa persona");
      qc.invalidateQueries({ queryKey: ["client", id] });
      setReferOpen(false);
      setReferError(undefined);
    },
    onError: (e: Error) => setReferError(e.message),
  });

  const c = q.data?.data as {
    id: string;
    firstName: string;
    lastName: string;
    code: string;
    phone: string;
    email?: string | null;
    documentId: string;
    city?: string;
    address?: string | null;
    locationUrl?: string | null;
    notes?: string | null;
    referenceName?: string | null;
    referencePhone?: string | null;
    status: ClientStatus;
    routeId?: string | null;
    route?: { id: string; name: string } | null;
    referredBy?: { id: string; code: string; firstName: string; lastName: string } | null;
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
    images?: Array<{ id: string; path: string }>;
    referralsMade?: Array<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      status: ReferralStatus;
      pointsAwarded: boolean;
      createdAt: string;
      registeredClient?: { id: string; code: string } | null;
    }>;
  } | undefined;

  if (!c) return <p>Cargando...</p>;
  const progress = progressToNextLevel(c.points);
  const openCredit = c.credits.find((item) => item.status === "ACTIVE" && Number(item.balance) > 0);
  const openDebt: OutstandingCredit | null = openCredit
    ? {
        id: openCredit.id,
        code: openCredit.code,
        productName: openCredit.product.name,
        balance: Number(openCredit.balance),
        weeklyQuota: Number(openCredit.weeklyQuota),
        remaining: openCredit.installments.filter((item) => item.status !== "PAID").length,
        nextDueDate: openCredit.installments.find((item) => item.status !== "PAID")?.dueDate ?? null,
        nextAmount: openCredit.installments.find((item) => item.status !== "PAID")
          ? Number(openCredit.installments.find((item) => item.status !== "PAID")?.amount)
          : null,
        overdueCount: openCredit.installments.filter((item) => item.status === "OVERDUE").length,
      }
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${c.firstName} ${c.lastName}`}
        description={`${c.code} · ${formatCedula(c.documentId)} · ${formatPhoneRD(c.phone)}${c.email ? ` · ${c.email}` : ""}`}
        icon={Users}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/clientes") },
          { label: "Editar", icon: Pencil, variant: "ghost", onClick: () => setEditing(true) },
          {
            label: c.status === "ACTIVE" ? "Desactivar" : "Reactivar",
            variant: "ghost",
            onClick: () => setConfirmOff(true),
          },
          ...(!c.affiliationPaid
            ? ([{ label: "Cobrar afiliación", onClick: () => affiliate.mutate() }] satisfies HeaderAction[])
            : []),
          ...(!c.catalogApproved && (c.level === "PLATA" || c.level === "ORO")
            ? ([{ label: "Aprobar catálogo Oro", onClick: () => approveOro.mutate() }] satisfies HeaderAction[])
            : []),
          { label: "Referir cliente", icon: UserPlus, variant: "ghost", onClick: () => { setReferError(undefined); setReferOpen(true); } },
          { label: "Nuevo crédito", onClick: () => {
            if (openDebt) setDebt(openDebt);
            else navigate(`/creditos/nuevo?clientId=${id}`);
          } },
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
          <p className="text-sm text-slate-600">{c.email || "Sin correo. Edita el cliente para agregarlo."}</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Referencia personal</p>
          {c.referenceName ? (
            <>
              <p className="mt-2 font-semibold">{c.referenceName}</p>
              <p className="text-sm text-slate-600">{formatPhoneRD(c.referencePhone ?? "")}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Contacto de confianza. No es un cliente referido.</p>
          )}
          {c.referredBy ? (
            <p className="mt-3 text-sm text-navy-800">
              Lo trajo <Link className="font-semibold" to={`/clientes/${c.referredBy.id}`}>{c.referredBy.firstName} {c.referredBy.lastName}</Link> ({c.referredBy.code})
            </p>
          ) : null}
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Fotos</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(c.images ?? []).length === 0 && <p className="col-span-full text-sm text-slate-500">Todavía no hay fotos.</p>}
            {(c.images ?? []).map((image) => (
              <a key={image.id} href={mediaUrl(image.path)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl">
                <img src={mediaUrl(image.path)} alt="" className="h-24 w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">Clientes referidos</h3>
            <p className="text-sm text-slate-500">Nombre y teléfono. Al entrarlos y validarlos, este cliente gana {POINTS_RULES.REFERRAL} puntos.</p>
          </div>
          <button
            type="button"
            className="btn-gold"
            onClick={() => {
              setReferError(undefined);
              setReferOpen(true);
            }}
          >
            Referir cliente
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(c.referralsMade ?? []).length === 0 && <li className="text-slate-500">Todavía no ha referido a nadie.</li>}
          {(c.referralsMade ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <div>
                <p className="font-semibold">{item.firstName} {item.lastName}</p>
                <p className="text-xs text-slate-500">{formatPhoneRD(item.phone)}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {REFERRAL_STATUS_LABELS[item.status]}
                {item.pointsAwarded ? ` · +${POINTS_RULES.REFERRAL}` : ""}
              </span>
            </li>
          ))}
        </ul>
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
          onSave={(body, files) => update.mutate({ body, files })}
        />
      )}
      {confirmOff && (
        <ConfirmModal
          title={c.status === "ACTIVE" ? "Desactivar cliente" : "Reactivar cliente"}
          message={c.status === "ACTIVE" ? "Vas a desactivar a" : "Vas a reactivar a"}
          itemName={`${c.firstName} ${c.lastName}`}
          confirmText={c.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            c.status === "ACTIVE"
              ? [
                  "No se borra: créditos, cuotas y pagos se quedan",
                  "No podrá consultar el portal",
                  "No se le entregan productos nuevos",
                  "Puedes reactivarlo cuando quieras",
                ]
              : [
                  "Volverá a aparecer en el portal y en cobranza",
                  "Se le podrán entregar productos otra vez",
                ]
          }
          onClose={() => setConfirmOff(false)}
          onConfirm={() => toggle.mutate(c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
        />
      )}
      {referOpen && (
        <Modal title="Referir un cliente" onClose={() => setReferOpen(false)}>
          <ReferClientForm
            error={referError}
            loading={refer.isPending}
            onCancel={() => setReferOpen(false)}
            onSave={(body) => refer.mutate(body)}
          />
        </Modal>
      )}
      {debt && (
        <InfoModal
          title="Hay que saldar el crédito anterior"
          message="Este cliente todavía debe"
          itemName={debt.productName}
          facts={debtFacts(debt)}
          notes={debtNotes(debt)}
          actionLabel="Ir a registrar pago"
          onAction={() => navigate(`/pagos?creditId=${debt.id}&clientId=${c.id}`)}
          onClose={() => setDebt(null)}
        />
      )}
    </div>
  );
}
