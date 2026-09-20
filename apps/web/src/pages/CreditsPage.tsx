import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { creditsFromDebtError, debtFacts, debtNotes, isDebtError } from "../lib/debt";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { ArrowLeft, FileText, Pencil, Plus } from "lucide-react";
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
  client: { firstName: string; lastName: string; code: string };
  product: { name: string };
};

export function CreditsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
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
                onDeactivate={c.status === "ACTIVE" ? () => setConfirm({ credit: c, activate: false }) : undefined}
                onActivate={c.status === "CANCELLED" ? () => setConfirm({ credit: c, activate: true }) : undefined}
              />
            </td>
          </tr>
        ))}
      </DataTable>
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
}) {
  const down = parseMoney(downPayment) || 0;
  const financed = price > 0 ? financedAmount(price, down) : 0;

  return (
    <>
      <Field label="Frecuencia de cuota">
        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}>
          {PAYMENT_FREQUENCIES.map((item) => (
            <option key={item} value={item}>{PAYMENT_FREQUENCY_LABELS[item]}</option>
          ))}
        </select>
      </Field>
      <Field label="Pago inicial" hint={fieldHint("money")} error={errors.downPayment}>
        <FormattedInput
          kind="money"
          value={downPayment}
          error={Boolean(errors.downPayment)}
          onValue={(value) => {
            setDownPayment(value);
            const nextDown = parseMoney(value) || 0;
            const count = parseInteger(weeks);
            if (price > 0 && Number.isInteger(count) && count > 0) {
              setWeeklyQuota(String(quotaFromInstallments(price, nextDown, count)));
            }
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Cantidad (${PAYMENT_FREQUENCY_UNIT[frequency]})`} hint="Al cambiar, se calcula la cuota" error={errors.weeks}>
          <FormattedInput
            kind="integer"
            required
            value={weeks}
            error={Boolean(errors.weeks)}
            onValue={(value) => {
              setWeeks(value);
              const count = parseInteger(value);
              if (price > 0 && Number.isInteger(count) && count > 0) {
                setWeeklyQuota(String(quotaFromInstallments(price, down, count)));
              }
            }}
          />
        </Field>
        <Field label="Monto de cada cuota" hint="Al cambiar, se calculan las cuotas" error={errors.weeklyQuota}>
          <FormattedInput
            kind="money"
            required
            value={weeklyQuota}
            error={Boolean(errors.weeklyQuota)}
            onValue={(value) => {
              setWeeklyQuota(value);
              const quota = parseMoney(value);
              if (price > 0 && quota > 0) {
                setWeeks(String(installmentsFromQuota(price, down, quota)));
              }
            }}
          />
        </Field>
      </div>
      {price > 0 && (
        <p className="rounded-xl bg-gold-50 p-3 text-sm">
          Precio {money(price)} · Inicial {money(down)} · A financiar {money(financed)} · {parseInteger(weeks) || 0} {PAYMENT_FREQUENCY_UNIT[frequency]} · cuota {money(parseMoney(weeklyQuota) || 0)}
        </p>
      )}
    </>
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
      api<Array<{ id: string; name: string; price: number; catalogTier: CatalogTier }>>("/api/products?pageSize=100"),
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

  useEffect(() => {
    if (!settings.data) return;
    setWeeklyQuota((q) => (q === "" ? String(settings.data.data.weeklyQuota) : q));
    setWeeks((w) => (w === "" ? String(settings.data.data.defaultWeeks) : w));
  }, [settings.data]);

  const selectedClient = (clients.data?.data ?? []).find((c) => c.id === clientId);
  const openDebt = (selectedClient?.credits ?? [])
    .filter((credit) => Number(credit.balance) > 0)
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
    selectedClient ? allowedTiers.includes(p.catalogTier) : true,
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
    if (!product) return;
    const count = parseInteger(weeks) || settings.data?.data.defaultWeeks || 10;
    const down = parseMoney(downPayment) || 0;
    setWeeks(String(count));
    setWeeklyQuota(String(quotaFromInstallments(product.price, down, count)));
  }, [productId]);

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

  return (
    <div className="panel max-w-2xl p-6">
      <PageHeader
        title="Nuevo crédito / entrega"
        description="Elige frecuencia, pago inicial y las cuotas se calculan solas"
        icon={FileText}
        actions={[{ label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") }]}
      />
      <form
        className="mt-4 grid gap-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const next = {
            clientId: clientId ? "" : "Selecciona un cliente",
            productId: productId ? "" : "Selecciona un producto",
            weeklyQuota: moneyError(weeklyQuota, { label: "cuota" }) ?? "",
            weeks: integerError(weeks, { min: 1, max: 104, label: "cantidad de cuotas" }) ?? "",
            downPayment: moneyError(downPayment, { allowZero: true, label: "pago inicial" }) ?? "",
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
          create.mutate();
        }}
      >
        <Field label="Cliente" error={errors.clientId}>
          <select className={`input ${errors.clientId ? "input-error" : ""}`} required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Seleccione</option>
            {(clients.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} · {LEVEL_LABELS[c.level]} {c.affiliationPaid ? "" : "(sin afiliación)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Producto" error={errors.productId}>
          <select className={`input ${errors.productId ? "input-error" : ""}`} required value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!clientId}>
            <option value="">{clientId ? "Seleccione" : "Primero elige un cliente"}</option>
            {visibleProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {CATALOG_TIER_LABELS[p.catalogTier]} · {money(p.price)}</option>
            ))}
          </select>
        </Field>
        {selectedClient && (
          <p className="text-sm text-slate-500">
            Nivel {LEVEL_LABELS[selectedClient.level]}: puede tomar {catalogAccessLabel(selectedClient.level)}.
          </p>
        )}
        {openDebt && (
          <button type="button" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm" onClick={() => setDebt(openDebt)}>
            <b>Tiene saldo pendiente</b> en {openDebt.productName} ({money(openDebt.balance)}). Hay que saldarlo antes de entregar otro producto.
          </button>
        )}
        <CreditPlanFields
          price={product?.price ?? 0}
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
        <button className="btn-primary" disabled={Boolean(openDebt)}>
          {openDebt ? "Saldar el anterior primero" : "Crear y entregar"}
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
        client: { firstName: string; lastName: string; id: string };
        product: { name: string };
        installments: Array<{ id: string; number: number; dueDate: string; amount: number; paidAmount: number; status: InstallmentStatus }>;
        payments: Array<{ id: string; type: string; amount: number }>;
      }>(`/api/credits/${id}`),
  });
  const c = q.data?.data;
  const [frequency, setFrequency] = useState<PaymentFrequency>("WEEKLY");
  const [downPayment, setDownPayment] = useState("0");
  const [weeklyQuota, setWeeklyQuota] = useState("");
  const [weeks, setWeeks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!c) return;
    setFrequency(c.frequency ?? "WEEKLY");
    setDownPayment(String(c.downPayment ?? 0));
    setWeeklyQuota(String(c.weeklyQuota));
    setWeeks(String(c.weeks));
  }, [c]);

  const update = useMutation({
    mutationFn: () =>
      api(`/api/credits/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          weeklyQuota: parseMoney(weeklyQuota),
          weeks: parseInteger(weeks),
          downPayment: parseMoney(downPayment) || 0,
          frequency,
        }),
      }),
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

  if (!c) return <p>Cargando...</p>;
  const nextOpen = c.installments.find((item) => item.status !== "PAID");
  const canEditPlan = c.installments.every((item) => Number(item.paidAmount) === 0);
  const initialPaid = (c.payments ?? []).find((item) => item.type === "DOWN_PAYMENT");

  return (
    <div className="space-y-4">
      <PageHeader
        title={c.product.name}
        description={`${c.code} · ${c.client.firstName} ${c.client.lastName}`}
        icon={FileText}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") },
          ...(canEditPlan ? [{ label: "Editar plan", icon: Pencil, variant: "ghost" as const, onClick: () => setEditing((v) => !v) }] : []),
          {
            label: c.status === "ACTIVE" ? "Desactivar" : "Reactivar",
            variant: "ghost" as const,
            onClick: () => setConfirmOff(true),
          },
          { label: "Registrar pago", href: `/pagos?creditId=${id}&clientId=${c.client.id}` },
        ]}
      />
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
      {editing && canEditPlan && (
        <form
          className="panel grid max-w-2xl gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const next = {
              weeklyQuota: moneyError(weeklyQuota, { label: "cuota" }) ?? "",
              weeks: integerError(weeks, { min: 1, max: 104, label: "cantidad de cuotas" }) ?? "",
              downPayment: moneyError(downPayment, { allowZero: true, label: "pago inicial" }) ?? "",
            };
            setErrors(next);
            const message = firstError(Object.values(next));
            if (message) {
              toast.error(message);
              return;
            }
            update.mutate();
          }}
        >
          <h3 className="font-display text-xl">Corregir plan</h3>
          <CreditPlanFields
            price={c.price}
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
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn-primary">Guardar plan</button>
          </div>
        </form>
      )}
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-900 text-xs uppercase text-gold-300">
            <tr>
              {["#", "Vence", "Cuota", "Pagado", "Estado"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.installments.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-5 py-3.5">{i.number}</td>
                <td className="px-5 py-3.5">{formatDate(i.dueDate)}</td>
                <td className="px-5 py-3.5">{money(i.amount)}</td>
                <td className="px-5 py-3.5">{money(i.paidAmount)}</td>
                <td className="px-5 py-3.5"><InstallmentBadge status={i.status} dueDate={i.dueDate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
