import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { creditsFromDebtError, debtFacts, debtNotes, isDebtError } from "../lib/debt";
import { Field, FormattedInput, FormattedTextarea, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { TableCard } from "../components/TableCard";
import { Loader, WaitLabel } from "../components/Loader";
import { useOnceSubmit } from "../hooks/useOnceSubmit";
import { ArrowLeft, FileText, Package, Pencil, Plus } from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoModal } from "../components/InfoModal";
import { RowActions } from "../components/RowActions";
import {
  catalogsForLevel,
  CATALOG_TIER_LABELS,
  catalogAccessLabel,
  financedAmount,
  firstError,
  integerError,
  LEVEL_LABELS,
  moneyError,
  parseInteger,
  parseMoney,
  PAYMENT_FREQUENCIES,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_FREQUENCY_UNIT,
  quotaFromInstallments,
  installmentsFromQuota,
  type CatalogTier,
  type ClientLevel,
  type CreditStatus,
  type InstallmentStatus,
  type OutstandingCredit,
  type PaymentFrequency,
} from "@hogarplus/shared";
import { CreditBadge, InstallmentBadge } from "../components/Badges";

type Credit = {
  id: string;
  code: string;
  status: CreditStatus;
  price: number;
  cost: number;
  balance: number;
  weeklyQuota: number;
  weeks: number;
  downPayment: number;
  frequency: PaymentFrequency;
  startDate: string;
  notes?: string | null;
  client: { firstName: string; lastName: string; code: string };
  product: { name: string; imageUrl?: string | null };
  installments?: Array<{ paidAmount: number }>;
};

function canEditCreditPlan(credit: { installments?: Array<{ paidAmount: number }> }) {
  return (credit.installments ?? []).every((item) => Number(item.paidAmount) === 0);
}

function isoDay(value: string) {
  return value.slice(0, 10);
}

export function CreditsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Credit | null>(null);
  const [confirm, setConfirm] = useState<{ credit: Credit; activate: boolean } | null>(null);
  const q = useQuery({
    queryKey: ["credits", search],
    queryFn: () => api<Credit[]>(`/api/credits?pageSize=50&search=${encodeURIComponent(search)}`),
  });
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CreditStatus }) =>
      api(`/api/credits/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success(confirm?.activate ? "Crédito reactivado" : "Crédito desactivado");
      qc.invalidateQueries({ queryKey: ["credits"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/credits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Crédito actualizado");
      qc.invalidateQueries({ queryKey: ["credits"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Créditos"
        description="Pago inicial, frecuencia y saldo de cada entrega"
        icon={FileText}
        searchPlaceholder="Buscar código, cliente o cédula"
        searchValue={search}
        onSearchChange={setSearch}
        actions={[{ label: "Nuevo crédito", icon: Plus, href: "/creditos/nuevo" }]}
      />
      <DataTable
        title="Cartera de créditos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin créditos"
        emptyDescription="Entrega el primer producto a crédito para abrir cartera."
        emptyAction={<a className="btn-gold" href="/creditos/nuevo">Nuevo crédito</a>}
        headers={["Código", "Cliente", "Producto", "Inicial", "Cuota", "Saldo", "Estado", "Acciones"]}
        mobile={rows.map((c) => (
          <TableCard
            key={c.id}
            title={<Link to={`/creditos/${c.id}`}>{c.code}</Link>}
            subtitle={`${c.client.firstName} ${c.client.lastName}`}
            photo={c.product.imageUrl ? mediaUrl(c.product.imageUrl) : null}
            initials={c.client.firstName}
            muted={c.status === "CANCELLED"}
            badge={<CreditBadge status={c.status} />}
            fields={[
              { label: "Producto", value: c.product.name },
              { label: "Inicial", value: money(c.downPayment ?? 0) },
              { label: "Cuota", value: money(c.weeklyQuota), hint: `${PAYMENT_FREQUENCY_LABELS[c.frequency ?? "WEEKLY"]} · ${c.weeks}` },
              { label: "Saldo", value: money(c.balance) },
            ]}
            actions={
              <RowActions
                active={c.status === "ACTIVE"}
                onEdit={c.status === "ACTIVE" ? () => setEditing(c) : undefined}
                onDeactivate={c.status === "ACTIVE" ? () => setConfirm({ credit: c, activate: false }) : undefined}
                onActivate={c.status === "CANCELLED" ? () => setConfirm({ credit: c, activate: true }) : undefined}
              />
            }
          />
        ))}
      >
        {rows.map((c) => (
          <tr key={c.id} className={`border-t ${c.status === "CANCELLED" ? "opacity-60" : ""}`}>
            <td className="px-5 py-3.5"><Link className="font-semibold" to={`/creditos/${c.id}`}>{c.code}</Link></td>
            <td className="px-5 py-3.5">{c.client.firstName} {c.client.lastName}</td>
            <td className="px-5 py-3.5">{c.product.name}</td>
            <td className="px-5 py-3.5">{money(c.downPayment ?? 0)}</td>
            <td className="px-5 py-3.5">
              {money(c.weeklyQuota)}
              <div className="text-xs text-slate-500">{PAYMENT_FREQUENCY_LABELS[c.frequency ?? "WEEKLY"]} · {c.weeks}</div>
            </td>
            <td className="px-5 py-3.5">{money(c.balance)}</td>
            <td className="px-5 py-3.5"><CreditBadge status={c.status} /></td>
            <td className="px-5 py-3.5">
              <RowActions
                active={c.status === "ACTIVE"}
                onEdit={c.status === "ACTIVE" ? () => setEditing(c) : undefined}
                onDeactivate={c.status === "ACTIVE" ? () => setConfirm({ credit: c, activate: false }) : undefined}
                onActivate={c.status === "CANCELLED" ? () => setConfirm({ credit: c, activate: true }) : undefined}
              />
            </td>
          </tr>
        ))}
      </DataTable>
      {editing && (
        <Modal title={`Editar ${editing.code}`} onClose={() => setEditing(null)} size="lg">
          <CreditEditForm
            credit={editing}
            locked={!canEditCreditPlan(editing)}
            saving={update.isPending}
            onCancel={() => setEditing(null)}
            onSave={(body) => update.mutate({ id: editing.id, body })}
          />
        </Modal>
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.activate ? "Reactivar crédito" : "Desactivar crédito"}
          message={confirm.activate ? "Vas a reactivar" : "Vas a desactivar"}
          itemName={`${confirm.credit.code} · ${confirm.credit.product.name}`}
          confirmText={confirm.activate ? "Reactivar" : "Desactivar"}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            confirm.activate
              ? ["Volverá a cobranza y se le podrán aplicar pagos"]
              : [
                  "No se borra: cuotas y pagos se quedan",
                  "Deja de salir en cobranza",
                  "El inventario no se revierte: el producto ya salió",
                  "Puedes reactivarlo si fue un error",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => toggle.mutate({ id: confirm.credit.id, status: confirm.activate ? "ACTIVE" : "CANCELLED" })}
        />
      )}
    </div>
  );
}

function CreditPlanFields({
  price,
  frequency,
  setFrequency,
  downPayment,
  setDownPayment,
  weeklyQuota,
  setWeeklyQuota,
  weeks,
  setWeeks,
  errors,
  locked,
}: {
  price: number;
  frequency: PaymentFrequency;
  setFrequency: (value: PaymentFrequency) => void;
  downPayment: string;
  setDownPayment: (value: string) => void;
  weeklyQuota: string;
  setWeeklyQuota: (value: string) => void;
  weeks: string;
  setWeeks: (value: string) => void;
  errors: Record<string, string>;
  locked?: boolean;
}) {
  const down = parseMoney(downPayment) || 0;
  const financed = price > 0 ? financedAmount(price, down) : 0;
  const count = parseInteger(weeks);
  const quota = parseMoney(weeklyQuota) || 0;

  function applyFromWeeks(nextWeeks: string, nextDown = down) {
    setWeeks(nextWeeks);
    const nextCount = parseInteger(nextWeeks);
    if (price > 0 && Number.isInteger(nextCount) && nextCount > 0) {
      setWeeklyQuota(String(quotaFromInstallments(price, nextDown, nextCount)));
    }
  }

  function applyFromDown(nextDownValue: string) {
    setDownPayment(nextDownValue);
    const nextDown = parseMoney(nextDownValue) || 0;
    if (price > 0 && Number.isInteger(count) && count > 0) {
      setWeeklyQuota(String(quotaFromInstallments(price, nextDown, count)));
    }
  }

  function applyFromQuota(nextQuotaValue: string) {
    setWeeklyQuota(nextQuotaValue);
    const nextQuota = parseMoney(nextQuotaValue);
    if (price > 0 && nextQuota > 0) {
      setWeeks(String(installmentsFromQuota(price, down, nextQuota)));
    }
  }

  return (
    <div className={`grid gap-3 ${locked ? "pointer-events-none opacity-50" : ""}`}>
      <Field label="Frecuencia de cuota" required>
        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
          {PAYMENT_FREQUENCIES.map((item) => (
            <option key={item} value={item}>{PAYMENT_FREQUENCY_LABELS[item]}</option>
          ))}
        </select>
      </Field>
      <Field label="Pago inicial" hint="Se resta del precio y el resto se parte en cuotas" error={errors.downPayment} required>
        <FormattedInput
          kind="money"
          value={downPayment}
          error={Boolean(errors.downPayment)}
          onValue={applyFromDown}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Cantidad (${PAYMENT_FREQUENCY_UNIT[frequency]})`} hint="Cambia esto y se calcula la cuota" error={errors.weeks} required>
          <FormattedInput
            kind="integer"
            required
            value={weeks}
            error={Boolean(errors.weeks)}
            onValue={(value) => applyFromWeeks(value)}
          />
        </Field>
        <Field label="Monto de cada cuota" hint="Cambia esto y se calcula cuántas cuotas van" error={errors.weeklyQuota} required>
          <FormattedInput
            kind="money"
            required
            value={weeklyQuota}
            error={Boolean(errors.weeklyQuota)}
            onValue={applyFromQuota}
          />
        </Field>
      </div>
      {price > 0 ? (
        <div className="rounded-2xl bg-gold-50 p-4 text-sm">
          <p className="font-semibold text-navy-900">Cálculo automático</p>
          <p className="mt-2">
            Precio {money(price)} − inicial {money(down)} = a financiar {money(financed)}
          </p>
          <p className="mt-1">
            {Number.isInteger(count) && count > 0 ? count : 0} {PAYMENT_FREQUENCY_UNIT[frequency]} × {money(quota)} = {money(financed)}
          </p>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Elige un producto para ver el precio, el inicial y la cuota calculada.
        </p>
      )}
    </div>
  );
}

function CreditEditForm({
  credit,
  locked,
  saving,
  onCancel,
  onSave,
}: {
  credit: {
    price: number;
    frequency: PaymentFrequency;
    downPayment: number;
    weeklyQuota: number;
    weeks: number;
    startDate: string;
    notes?: string | null;
    product: { name: string };
  };
  locked: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [frequency, setFrequency] = useState<PaymentFrequency>(credit.frequency ?? "WEEKLY");
  const [downPayment, setDownPayment] = useState(String(credit.downPayment ?? 0));
  const [weeklyQuota, setWeeklyQuota] = useState(String(credit.weeklyQuota));
  const [weeks, setWeeks] = useState(String(credit.weeks));
  const [startDate, setStartDate] = useState(isoDay(credit.startDate));
  const [notes, setNotes] = useState(credit.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useOnceSubmit(saving);

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (locked) {
          submit.guard(() => onSave({ notes: notes.trim() || undefined }));
          return;
        }
        const next = {
          weeklyQuota: moneyError(weeklyQuota, { label: "cuota" }) ?? "",
          weeks: integerError(weeks, { min: 1, max: 104, label: "cantidad de cuotas" }) ?? "",
          downPayment: moneyError(downPayment, { allowZero: true, label: "pago inicial" }) ?? "",
          startDate: /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? "" : "La fecha no es válida",
        };
        setErrors(next);
        const message = firstError(Object.values(next));
        if (message) {
          toast.error(message);
          return;
        }
        submit.guard(() => onSave({
          weeklyQuota: parseMoney(weeklyQuota),
          weeks: parseInteger(weeks),
          downPayment: parseMoney(downPayment) || 0,
          frequency,
          startDate,
          notes: notes.trim() || undefined,
        }));
      }}
    >
      <p className="text-sm text-slate-500">Producto: <b>{credit.product.name}</b> · {money(credit.price)}</p>
      {locked ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Ya hay cuotas cobradas. El plan se queda; puedes actualizar la nota.
        </p>
      ) : (
        <>
          <CreditPlanFields
            price={credit.price}
            frequency={frequency}
            setFrequency={setFrequency}
            downPayment={downPayment}
            setDownPayment={setDownPayment}
            weeklyQuota={weeklyQuota}
            setWeeklyQuota={setWeeklyQuota}
            weeks={weeks}
            setWeeks={setWeeks}
            errors={errors}
          />
          <Field label="Fecha de inicio" required>
            <FormattedInput kind="date" required value={startDate} error={Boolean(errors.startDate)} onValue={setStartDate} />
          </Field>
        </>
      )}
      <Field label="Nota">
        <FormattedTextarea value={notes} onValue={setNotes} placeholder="Acuerdo, horario de cobro, etc." />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={submit.blocked}>
          <WaitLabel waiting={submit.blocked} idle="Guardar cambios" busy="Guardando..." />
        </button>
      </div>
    </form>
  );
}

export function NewCreditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: () =>
      api<Array<{
        id: string;
        firstName: string;
        lastName: string;
        affiliationPaid: boolean;
        level: ClientLevel;
        credits?: Array<{
          id: string;
          code: string;
          status?: CreditStatus;
          balance: number;
          weeklyQuota: number;
          product: { name: string };
          installments: Array<{ dueDate: string; amount: number; number: number; status: InstallmentStatus }>;
        }>;
      }>>("/api/clients?pageSize=100"),
  });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      api<Array<{ id: string; name: string; price: number; catalogTier: CatalogTier; imageUrl?: string | null; description?: string | null; status?: string }>>("/api/products?pageSize=100"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ weeklyQuota: number; defaultWeeks: number }>("/api/settings"),
  });
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [productId, setProductId] = useState("");
  const [frequency, setFrequency] = useState<PaymentFrequency>("WEEKLY");
  const [downPayment, setDownPayment] = useState("0");
  const [weeklyQuota, setWeeklyQuota] = useState("");
  const [weeks, setWeeks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debt, setDebt] = useState<OutstandingCredit | null>(null);
  const clientDetail = useQuery({
    queryKey: ["client", clientId],
    queryFn: () =>
      api<{
        firstName: string;
        lastName: string;
        affiliationPaid: boolean;
        level: ClientLevel;
        credits: Array<{
          id: string;
          code: string;
          status: CreditStatus;
          balance: number;
          weeklyQuota: number;
          product: { name: string };
          installments: Array<{ dueDate: string; amount: number; number: number; status: InstallmentStatus }>;
        }>;
      }>(`/api/clients/${clientId}`),
    enabled: Boolean(clientId),
  });

  useEffect(() => {
    if (!settings.data) return;
    setWeeks((w) => (w === "" ? String(settings.data.data.defaultWeeks) : w));
  }, [settings.data]);

  const selectedClient = (clients.data?.data ?? []).find((c) => c.id === clientId);
  const debtCredits = clientDetail.data?.data.credits ?? selectedClient?.credits ?? [];
  const openDebt = debtCredits
    .filter((credit) => Number(credit.balance) > 0 && credit.status !== "CANCELLED" && credit.status !== "COMPLETED")
    .map((credit) => {
      const remaining = (credit.installments ?? []).filter((item) => item.status !== "PAID");
      const next = remaining[0];
      return {
        id: credit.id,
        code: credit.code,
        productName: credit.product.name,
        balance: Number(credit.balance),
        weeklyQuota: Number(credit.weeklyQuota),
        remaining: remaining.length,
        nextDueDate: next?.dueDate ?? null,
        nextAmount: next ? Number(next.amount) : null,
        overdueCount: remaining.filter((item) => item.status === "OVERDUE").length,
      } satisfies OutstandingCredit;
    })[0] ?? null;

  useEffect(() => {
    setDebt(openDebt);
  }, [clientId, openDebt?.id]);
  const allowedTiers = selectedClient ? catalogsForLevel(selectedClient.level) : [];
  const visibleProducts = (products.data?.data ?? []).filter((p) =>
    p.status !== "INACTIVE" && (selectedClient ? allowedTiers.includes(p.catalogTier) : true),
  );
  const product = (products.data?.data ?? []).find((p) => p.id === productId);

  useEffect(() => {
    if (!productId || !selectedClient) return;
    const stillAllowed = (products.data?.data ?? []).some(
      (p) => p.id === productId && catalogsForLevel(selectedClient.level).includes(p.catalogTier),
    );
    if (!stillAllowed) setProductId("");
  }, [clientId, productId, products.data, selectedClient]);

  useEffect(() => {
    if (!product) {
      setWeeklyQuota("");
      return;
    }
    const count = parseInteger(weeks) || settings.data?.data.defaultWeeks || 10;
    const down = parseMoney(downPayment) || 0;
    setWeeks(String(count));
    setWeeklyQuota(String(quotaFromInstallments(product.price, down, count)));
  }, [productId, product?.price]);

  const create = useMutation({
    mutationFn: () =>
      api("/api/credits", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          productId,
          weeklyQuota: parseMoney(weeklyQuota),
          weeks: parseInteger(weeks),
          downPayment: parseMoney(downPayment) || 0,
          frequency,
        }),
      }),
    onSuccess: (res) => {
      toast.success("Crédito creado");
      const id = (res.data as { id: string }).id;
      navigate(`/creditos/${id}`);
    },
    onError: (e: Error) => {
      if (isDebtError(e)) {
        setDebt(creditsFromDebtError(e)[0] ?? openDebt);
        return;
      }
      toast.error(e.message);
    },
  });
  const submit = useOnceSubmit(create.isPending);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nuevo crédito / entrega"
        description="Elige frecuencia, pago inicial y las cuotas se calculan solas"
        icon={FileText}
        actions={[{ label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") }]}
      />
      <form
        className="panel grid max-w-2xl gap-3 p-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const next = {
            clientId: clientId ? "" : "Selecciona un cliente",
            productId: productId ? "" : "Selecciona un producto",
            weeklyQuota: productId ? moneyError(weeklyQuota, { label: "cuota" }) ?? "" : "",
            weeks: productId ? integerError(weeks, { min: 1, max: 104, label: "cantidad de cuotas" }) ?? "" : "",
            downPayment: productId ? moneyError(downPayment, { allowZero: true, label: "pago inicial" }) ?? "" : "",
          };
          setErrors(next);
          const message = firstError(Object.values(next));
          if (openDebt) {
            setDebt(openDebt);
            return;
          }
          if (message) {
            toast.error(message);
            return;
          }
          submit.guard(() => create.mutate());
        }}
      >
        <Field label="Cliente" error={errors.clientId} required>
          <select className={`input ${errors.clientId ? "input-error" : ""}`} required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Seleccione</option>
            {(clients.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} · {LEVEL_LABELS[c.level]} {c.affiliationPaid ? "" : "(sin afiliación)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Producto" error={errors.productId} required>
          {!clientId ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Primero elige un cliente</p>
          ) : openDebt ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Saldar el crédito anterior para elegir otro producto.</p>
          ) : visibleProducts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">No hay productos de su categoría.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProductId(p.id);
                    setErrors((current) => ({ ...current, productId: "" }));
                  }}
                  className={`overflow-hidden rounded-2xl border text-left transition ${
                    productId === p.id ? "border-navy-900 ring-2 ring-gold-400" : errors.productId ? "border-rose-400" : "border-slate-200 hover:border-navy-300"
                  }`}
                >
                  <div className="h-28 bg-slate-100">
                    {p.imageUrl ? (
                      <img src={mediaUrl(p.imageUrl)} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Package size={22} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{CATALOG_TIER_LABELS[p.catalogTier]}</p>
                    <p className="font-semibold leading-tight">{p.name}</p>
                    {p.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p> : null}
                    <p className="mt-1 text-sm font-bold">{money(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Field>
        {selectedClient && !openDebt && (
          <p className="text-sm text-slate-500">
            Nivel {LEVEL_LABELS[selectedClient.level]}: puede tomar {catalogAccessLabel(selectedClient.level)}. Elige el producto para calcular inicial y cuotas.
          </p>
        )}
        {openDebt && (
          <button type="button" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm" onClick={() => setDebt(openDebt)}>
            <b>Tiene saldo pendiente</b> en {openDebt.productName} ({money(openDebt.balance)}). Hay que saldarlo antes de entregar otro producto.
          </button>
        )}
        {product && !openDebt ? (
          <CreditPlanFields
            price={product.price}
            frequency={frequency}
            setFrequency={setFrequency}
            downPayment={downPayment}
            setDownPayment={setDownPayment}
            weeklyQuota={weeklyQuota}
            setWeeklyQuota={setWeeklyQuota}
            weeks={weeks}
            setWeeks={setWeeks}
            errors={errors}
          />
        ) : !openDebt ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Elige cliente y producto para ver el precio, el inicial y las cuotas.
          </p>
        ) : null}
        <button className="btn-primary" disabled={submit.blocked || Boolean(openDebt) || !productId}>
          <WaitLabel
            waiting={submit.blocked}
            idle={openDebt ? "Saldar el anterior primero" : productId ? "Crear y entregar" : "Elige un producto para calcular"}
            busy="Creando crédito..."
          />
        </button>
      </form>
      {debt && (
        <InfoModal
          title="Hay que saldar el crédito anterior"
          message="Este cliente todavía debe"
          itemName={debt.productName}
          facts={debtFacts(debt)}
          notes={debtNotes(debt)}
          actionLabel="Ir a registrar pago"
          onAction={() => navigate(`/pagos?creditId=${debt.id}&clientId=${clientId}`)}
          onClose={() => setDebt(null)}
        />
      )}
    </div>
  );
}

export function CreditDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const q = useQuery({
    queryKey: ["credit", id],
    queryFn: () =>
      api<{
        code: string;
        price: number;
        cost: number;
        balance: number;
        weeklyQuota: number;
        weeks: number;
        downPayment: number;
        frequency: PaymentFrequency;
        startDate: string;
        status: CreditStatus;
        notes?: string | null;
        client: { firstName: string; lastName: string; id: string };
        product: { name: string; imageUrl?: string | null };
        installments: Array<{ id: string; number: number; dueDate: string; amount: number; paidAmount: number; status: InstallmentStatus }>;
        payments: Array<{ id: string; type: string; amount: number }>;
      }>(`/api/credits/${id}`),
  });
  const c = q.data?.data;

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/credits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Crédito actualizado");
      qc.invalidateQueries({ queryKey: ["credit", id] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (status: CreditStatus) =>
      api(`/api/credits/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success(c?.status === "ACTIVE" ? "Crédito desactivado" : "Crédito reactivado");
      qc.invalidateQueries({ queryKey: ["credit", id] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      setConfirmOff(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!c) return <Loader label="Cargando crédito..." />;
  const nextOpen = c.installments.find((item) => item.status !== "PAID");
  const canEditPlan = c.installments.every((item) => Number(item.paidAmount) === 0);
  const initialPaid = (c.payments ?? []).find((item) => item.type === "DOWN_PAYMENT");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {c.product.imageUrl ? (
          <img
            src={mediaUrl(c.product.imageUrl)}
            alt={c.product.name}
            className="h-40 w-full rounded-2xl object-cover lg:h-auto lg:w-44"
          />
        ) : null}
        <div className="min-w-0 flex-1">
      <PageHeader
        title={c.product.name}
        description={`${c.code} · ${c.client.firstName} ${c.client.lastName}`}
        icon={FileText}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") },
          ...(c.status === "ACTIVE"
            ? [{ label: "Editar", icon: Pencil, variant: "ghost" as const, onClick: () => setEditing(true) }]
            : []),
          {
            label: c.status === "ACTIVE" ? "Desactivar" : "Reactivar",
            variant: "ghost" as const,
            onClick: () => setConfirmOff(true),
          },
          { label: "Registrar pago", href: `/pagos?creditId=${id}&clientId=${c.client.id}` },
        ]}
      />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Empezó</p>
          <p className="mt-2 font-semibold">{formatDate(c.startDate)}</p>
          <div className="mt-2"><CreditBadge status={c.status} /></div>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Pago inicial</p>
          <p className="mt-2 font-semibold">{money(c.downPayment ?? 0)}</p>
          <p className="mt-1 text-sm text-slate-500">{initialPaid ? "Registrado en pagos" : "Sin inicial"}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Cuota {PAYMENT_FREQUENCY_LABELS[c.frequency ?? "WEEKLY"].toLowerCase()}</p>
          <p className="mt-2 font-semibold">{money(c.weeklyQuota)}</p>
          <p className="mt-1 text-sm text-slate-500">{c.weeks} {PAYMENT_FREQUENCY_UNIT[c.frequency ?? "WEEKLY"]}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-slate-500">Saldo</p>
          <p className="mt-2 font-display text-2xl">{money(c.balance)}</p>
          <p className="mt-1 text-sm text-slate-500">
            {nextOpen ? `Próxima ${formatDate(nextOpen.dueDate)}` : "Sin cuotas pendientes"}
          </p>
        </div>
      </div>
      {editing && (
        <Modal title={`Editar ${c.code}`} onClose={() => setEditing(false)} size="lg">
          <CreditEditForm
            credit={{
              price: c.price,
              frequency: c.frequency ?? "WEEKLY",
              downPayment: c.downPayment ?? 0,
              weeklyQuota: c.weeklyQuota,
              weeks: c.weeks,
              startDate: c.startDate,
              notes: c.notes,
              product: c.product,
            }}
            locked={!canEditPlan}
            saving={update.isPending}
            onCancel={() => setEditing(false)}
            onSave={(body) => update.mutate(body)}
          />
        </Modal>
      )}
      <DataTable
        title="Cuotas"
        count={c.installments.length}
        rows={c.installments.length}
        emptyTitle="Sin cuotas"
        emptyDescription="Este crédito no tiene cuotas programadas."
        headers={["#", "Vence", "Cuota", "Pagado", "Estado"]}
        mobile={c.installments.map((i) => (
          <TableCard
            key={i.id}
            title={`Cuota ${i.number}`}
            subtitle={formatDate(i.dueDate)}
            initials={String(i.number)}
            badge={<InstallmentBadge status={i.status} dueDate={i.dueDate} />}
            fields={[
              { label: "Cuota", value: money(i.amount) },
              { label: "Pagado", value: money(i.paidAmount) },
            ]}
          />
        ))}
      >
        {c.installments.map((i) => (
          <tr key={i.id} className="border-t">
            <td className="px-5 py-3.5">{i.number}</td>
            <td className="px-5 py-3.5">{formatDate(i.dueDate)}</td>
            <td className="px-5 py-3.5">{money(i.amount)}</td>
            <td className="px-5 py-3.5">{money(i.paidAmount)}</td>
            <td className="px-5 py-3.5"><InstallmentBadge status={i.status} dueDate={i.dueDate} /></td>
          </tr>
        ))}
      </DataTable>
      {confirmOff && (
        <ConfirmModal
          title={c.status === "ACTIVE" ? "Desactivar crédito" : "Reactivar crédito"}
          message={c.status === "ACTIVE" ? "Vas a desactivar" : "Vas a reactivar"}
          itemName={`${c.code} · ${c.product.name}`}
          confirmText={c.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            c.status === "ACTIVE"
              ? [
                  "No se borra: cuotas y pagos se quedan",
                  "Deja de salir en cobranza",
                  "El inventario no se revierte: el producto ya salió",
                  "Puedes reactivarlo si fue un error",
                ]
              : ["Volverá a cobranza y se le podrán aplicar pagos"]
          }
          onClose={() => setConfirmOff(false)}
          onConfirm={() => toggle.mutate(c.status === "ACTIVE" ? "CANCELLED" : "ACTIVE")}
        />
      )}
    </div>
  );
}
