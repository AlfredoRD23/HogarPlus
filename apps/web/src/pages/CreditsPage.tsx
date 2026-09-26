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
import { ArrowLeft, BadgePercent, Crown, FileText, Package, Pencil, Plus } from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoModal } from "../components/InfoModal";
import { RowActions } from "../components/RowActions";
import {
  catalogsForLevel,
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
  type ProductPromoFields,
  type ActiveOffer,
  effectivePrice,
} from "@hogarplus/shared";
import { CatalogBadge, CreditBadge, InstallmentBadge } from "../components/Badges";
import { StatusTabs } from "../components/StatusTabs";

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

type CreditInstallment = {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  discountAmount?: number;
  discountReason?: string | null;
};

function canEditCreditPlan(credit: { installments?: Array<{ paidAmount: number; discountAmount?: number }> }) {
  return (credit.installments ?? []).every(
    (item) => Number(item.paidAmount) === 0 && Number(item.discountAmount ?? 0) === 0,
  );
}

function InstallmentDiscountForm({
  creditId,
  installment,
  onDone,
}: {
  creditId: string;
  installment: CreditInstallment;
  onDone: () => void;
}) {
  const due = Math.max(0, Number(installment.amount) - Number(installment.paidAmount));
  const [mode, setMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("Por pagar a tiempo");
  const [notify, setNotify] = useState(true);

  const parsed = mode === "AMOUNT" ? parseMoney(value) : Number(value.replace(/[^\d.]/g, ""));
  const discount = Number.isFinite(parsed) && parsed > 0
    ? Math.round((mode === "AMOUNT" ? parsed : (due * parsed) / 100) * 100) / 100
    : 0;
  const error =
    !value ? undefined
    : discount <= 0 ? "Pon un descuento mayor que 0"
    : mode === "PERCENT" && parsed > 100 ? "Máximo 100%"
    : discount > due + 0.001 ? `No puede pasar lo que falta: ${money(due)}`
    : undefined;

  const save = useMutation({
    mutationFn: () =>
      api<{ discount: number; notified: boolean }>(
        `/api/credits/${creditId}/installments/${installment.id}/discount`,
        { method: "POST", body: JSON.stringify({ mode, value: parsed, reason: reason.trim() || undefined, notify }) },
      ),
    onSuccess: (res) => {
      toast.success(
        res.data.notified
          ? `Descuento de ${money(res.data.discount)} aplicado y avisado por correo`
          : `Descuento de ${money(res.data.discount)} aplicado`,
      );
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!error && discount > 0) save.mutate();
      }}
    >
      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Falta de esta cuota</span><strong>{money(due)}</strong></div>
        <div className="mt-1 flex justify-between text-emerald-700"><span>Descuento</span><strong>−{money(discount)}</strong></div>
        <div className="mt-2 flex justify-between border-t pt-2 text-base"><span>Pagará</span><strong>{money(Math.max(0, due - discount))}</strong></div>
      </div>
      <div className="flex gap-2">
        {(["AMOUNT", "PERCENT"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setMode(item); setValue(""); }}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${mode === item ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {item === "AMOUNT" ? "Monto RD$" : "Porcentaje %"}
          </button>
        ))}
      </div>
      <Field label={mode === "AMOUNT" ? "Monto a descontar" : "Porcentaje a descontar"} error={error} required>
        <FormattedInput kind={mode === "AMOUNT" ? "money" : "percent"} value={value} onValue={setValue} error={Boolean(error)} autoFocus />
      </Field>
      <Field label="Motivo" hint="Sale en el correo del cliente">
        <FormattedInput kind="text" value={reason} onValue={setReason} maxLength={200} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
        Avisar al cliente por correo
      </label>
      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={save.isPending || Boolean(error) || discount <= 0}>
          <WaitLabel waiting={save.isPending} idle="Aplicar descuento" busy="Aplicando..." />
        </button>
      </div>
    </form>
  );
}

function isoDay(value: string) {
  return value.slice(0, 10);
}

export function CreditsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Credit | null>(null);
  const [confirm, setConfirm] = useState<{ credit: Credit; activate: boolean } | null>(null);
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
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
  const allRows = q.data?.data ?? [];
  const activeRows = allRows.filter((c) => c.status !== "CANCELLED");
  const inactiveRows = allRows.filter((c) => c.status === "CANCELLED");
  const rows = statusTab === "ACTIVE" ? activeRows : inactiveRows;

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
      <StatusTabs
        value={statusTab}
        onChange={setStatusTab}
        activeCount={activeRows.length}
        inactiveCount={inactiveRows.length}
        inactiveLabel="Desactivados"
      />
      <DataTable
        title="Cartera de créditos"
        count={rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle={statusTab === "ACTIVE" ? "Sin créditos activos" : "Sin créditos desactivados"}
        emptyDescription={statusTab === "ACTIVE" ? "Entrega el primer producto a crédito para abrir cartera." : "Los que desactives aparecen aquí."}
        emptyAction={<a className="btn-primary" href="/creditos/nuevo">Nuevo crédito</a>}
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
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
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
      api<Array<{ id: string; name: string; price: number; catalogTier: CatalogTier; imageUrl?: string | null; description?: string | null; status?: string } & ProductPromoFields>>("/api/products?pageSize=100"),
  });
  const exclusiveOffers = useQuery({
    queryKey: ["client-offers", clientId],
    enabled: Boolean(clientId),
    queryFn: () =>
      api<Array<{ productId: string; offer: ActiveOffer | null }>>(`/api/client-offers?clientId=${clientId}`),
  });
  const pricedProducts = (products.data?.data ?? []).map((p) => {
    const general = effectivePrice(p);
    const exclusive = (exclusiveOffers.data?.data ?? []).find((item) => item.productId === p.id && item.offer)?.offer ?? null;
    return {
      ...p,
      basePrice: Number(p.price),
      price: exclusive ? Math.min(general, exclusive.finalPrice) : general,
      exclusive,
    };
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ weeklyQuota: number; defaultWeeks: number }>("/api/settings"),
  });
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
  const visibleProducts = pricedProducts.filter((p) =>
    p.status !== "INACTIVE" && (selectedClient ? allowedTiers.includes(p.catalogTier) : true),
  );
  const product = pricedProducts.find((p) => p.id === productId);

  useEffect(() => {
    if (!productId || !selectedClient) return;
    const stillAllowed = pricedProducts.some(
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
                  <div className="relative h-28 overflow-hidden bg-slate-100">
                    {p.imageUrl ? (
                      <img src={mediaUrl(p.imageUrl)} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <Package size={22} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <CatalogBadge tier={p.catalogTier} />
                      {p.exclusive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                          <Crown size={11} /> Exclusiva: {p.exclusive.headline}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold leading-tight">{p.name}</p>
                    {p.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p> : null}
                    <p className="mt-1 text-sm font-bold">
                      {p.price < p.basePrice ? (
                        <span className="mr-1.5 font-normal text-slate-400 line-through">{money(p.basePrice)}</span>
                      ) : null}
                      {money(p.price)}
                    </p>
                    {p.exclusive?.detail ? (
                      <p className="mt-0.5 text-xs text-violet-700">{p.exclusive.type === "GIFT" ? `Gratis: ${p.exclusive.detail}` : p.exclusive.detail}</p>
                    ) : null}
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
        installments: CreditInstallment[];
        payments: Array<{ id: string; type: string; amount: number }>;
      }>(`/api/credits/${id}`),
  });
  const [discounting, setDiscounting] = useState<CreditInstallment | null>(null);
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
  const canEditPlan = c.installments.every(
    (item) => Number(item.paidAmount) === 0 && Number(item.discountAmount ?? 0) === 0,
  );
  const canDiscount = (i: CreditInstallment) =>
    c.status === "ACTIVE" && i.status !== "PAID" && i.status !== "PREPAID" && Number(i.amount) - Number(i.paidAmount) > 0;
  const amountCell = (i: CreditInstallment) => (
    <>
      {money(i.amount)}
      {Number(i.discountAmount ?? 0) > 0 ? (
        <span className="block text-xs font-semibold text-emerald-600" title={i.discountReason ?? undefined}>
          Descuento −{money(i.discountAmount ?? 0)}
        </span>
      ) : null}
    </>
  );
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
        headers={["#", "Vence", "Cuota", "Pagado", "Estado", ""]}
        mobile={c.installments.map((i) => (
          <TableCard
            key={i.id}
            title={`Cuota ${i.number}`}
            subtitle={formatDate(i.dueDate)}
            initials={String(i.number)}
            badge={<InstallmentBadge status={i.status} dueDate={i.dueDate} />}
            fields={[
              { label: "Cuota", value: amountCell(i) },
              { label: "Pagado", value: money(i.paidAmount) },
            ]}
            actions={
              canDiscount(i) ? (
                <button type="button" className="btn-ghost text-emerald-700" onClick={() => setDiscounting(i)}>
                  <BadgePercent className="h-4 w-4" /> Dar descuento
                </button>
              ) : undefined
            }
          />
        ))}
      >
        {c.installments.map((i) => (
          <tr key={i.id} className="border-t">
            <td className="px-5 py-3.5">{i.number}</td>
            <td className="px-5 py-3.5">{formatDate(i.dueDate)}</td>
            <td className="px-5 py-3.5">{amountCell(i)}</td>
            <td className="px-5 py-3.5">{money(i.paidAmount)}</td>
            <td className="px-5 py-3.5"><InstallmentBadge status={i.status} dueDate={i.dueDate} /></td>
            <td className="px-5 py-3.5 text-right">
              {canDiscount(i) ? (
                <button type="button" className="btn-ghost text-emerald-700" onClick={() => setDiscounting(i)}>
                  <BadgePercent className="h-4 w-4" /> Descuento
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>
      {discounting && (
        <Modal
          title={`Descuento en la cuota ${discounting.number}`}
          description={`${c.client.firstName} ${c.client.lastName} · vence ${formatDate(discounting.dueDate)}`}
          onClose={() => setDiscounting(null)}
        >
          <InstallmentDiscountForm
            creditId={id}
            installment={discounting}
            onDone={() => {
              setDiscounting(null);
              qc.invalidateQueries({ queryKey: ["credit", id] });
              qc.invalidateQueries({ queryKey: ["credits"] });
            }}
          />
        </Modal>
      )}
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
