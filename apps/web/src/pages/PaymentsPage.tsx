import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { WaitLabel } from "../components/Loader";
import { RowActions } from "../components/RowActions";
import { TableCard } from "../components/TableCard";
import { Wallet } from "lucide-react";
import { PAYMENT_TYPE_LABELS, firstError, moneyError, parseMoney, referenceError, type PaymentMethod, type PaymentType } from "@hogarplus/shared";

type Payment = {
  id: string;
  code: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  createdAt: string;
  voidedAt?: string | null;
  client: { firstName: string; lastName: string };
  credit?: { code: string; balance: number; downPayment?: number; price?: number } | null;
};

export function PaymentsPage() {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<Payment[]>("/api/payments?pageSize=50"),
  });
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: () => api<Array<{ id: string; firstName: string; lastName: string }>>("/api/clients?pageSize=100"),
  });
  const credits = useQuery({
    queryKey: ["credits"],
    queryFn: () => api<Array<{ id: string; code: string; client: { id: string }; balance: number }>>("/api/credits?pageSize=100"),
  });

  const [form, setForm] = useState({
    clientId: params.get("clientId") ?? "",
    creditId: params.get("creditId") ?? "",
    amount: "",
    method: "CASH" as PaymentMethod,
    reference: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ weeklyQuota: number }>("/api/settings"),
  });
  useEffect(() => {
    if (!form.amount && settings.data?.data.weeklyQuota) {
      setForm((f) => ({ ...f, amount: String(settings.data.data.weeklyQuota) }));
    }
  }, [settings.data, form.amount]);

  const [voiding, setVoiding] = useState<Payment | null>(null);
  const voidPayment = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/payments/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      toast.success("Pago anulado");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      setVoiding(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: () =>
      api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          clientId: form.clientId,
          creditId: form.creditId || undefined,
          amount: parseMoney(form.amount),
          method: form.method,
          reference: form.reference.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Pago aplicado al saldo y a las cuotas");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagos"
        description="Registra cobros y aplícalos a las cuotas del cliente"
        icon={Wallet}
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <form
        className="panel p-5 space-y-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const needsReference = form.method === "TRANSFER" || form.method === "DEPOSIT";
          const next = {
            clientId: form.clientId ? "" : "Selecciona un cliente",
            amount: moneyError(form.amount, { label: "monto" }) ?? "",
            reference: referenceError(form.reference, needsReference) ?? "",
          };
          setErrors(next);
          const message = firstError(Object.values(next));
          if (message) return;
          create.mutate();
        }}
      >
        <h2 className="font-display text-2xl">Registrar pago</h2>
        <p className="text-xs text-slate-500">El pago se aplica primero a las cuotas más antiguas.</p>
        <Field label="Cliente" error={errors.clientId} required>
          <select className={`input ${errors.clientId ? "input-error" : ""}`} required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Seleccione</option>
            {(clients.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </Field>
        <Field label="Crédito">
          <select className="input" value={form.creditId} onChange={(e) => setForm({ ...form, creditId: e.target.value })}>
            <option value="">Automático (más antiguo)</option>
            {(credits.data?.data ?? []).filter((c) => !form.clientId || c.client.id === form.clientId).map((c) => (
              <option key={c.id} value={c.id}>{c.code} · saldo {money(c.balance)}</option>
            ))}
          </select>
        </Field>
        <Field label="Monto" hint={fieldHint("money")} error={errors.amount} required>
          <FormattedInput kind="money" required value={form.amount} error={Boolean(errors.amount)} onValue={(v) => setForm({ ...form, amount: v })} />
        </Field>
        <Field label="Método" required>
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="DEPOSIT">Depósito</option>
          </select>
        </Field>
        <Field label="Referencia" hint={form.method === "CASH" ? "Opcional en efectivo" : fieldHint("reference")} error={errors.reference}>
          <FormattedInput kind="reference" value={form.reference} error={Boolean(errors.reference)} onValue={(v) => setForm({ ...form, reference: v })} />
        </Field>
        <button className="btn-primary w-full" disabled={create.isPending}>
          <WaitLabel waiting={create.isPending} idle="Aplicar pago" busy="Aplicando..." />
        </button>
      </form>
      <DataTable
        title="Historial de pagos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin pagos"
        emptyDescription="Los cobros aparecerán aquí al registrar la primera cuota."
        headers={["Código", "Cliente", "Tipo", "Monto", "Inicial / Resta", "Fecha", "Acciones"]}
        mobile={rows.map((p) => (
          <TableCard
            key={p.id}
            title={`${p.client.firstName} ${p.client.lastName}`}
            subtitle={p.credit?.code ? `${p.code} · ${p.credit.code}` : p.code}
            initials={p.client.firstName}
            muted={Boolean(p.voidedAt)}
            badge={p.voidedAt ? <span className="text-[11px] font-bold uppercase text-rose-700">Anulado</span> : null}
            fields={[
              { label: "Tipo", value: PAYMENT_TYPE_LABELS[p.type] },
              { label: "Monto", value: money(p.amount) },
              {
                label: "Inicial / Resta",
                value: p.credit ? `Inicial ${money(p.credit.downPayment ?? 0)}` : "—",
                hint: p.credit ? `Resta ${money(p.credit.balance)}` : undefined,
              },
              { label: "Fecha", value: formatDate(p.createdAt) },
            ]}
            actions={
              !p.voidedAt && p.type !== "AFFILIATION" ? (
                <RowActions onDeactivate={() => setVoiding(p)} deactivateLabel="Anular" />
              ) : undefined
            }
          />
        ))}
      >
        {rows.map((p) => (
          <tr key={p.id} className={`border-t ${p.voidedAt ? "opacity-40" : ""}`}>
            <td className="px-5 py-3.5">{p.code}</td>
            <td className="px-5 py-3.5">
              {p.client.firstName} {p.client.lastName}
              {p.credit?.code ? <div className="text-xs text-slate-500">{p.credit.code}</div> : null}
            </td>
            <td className="px-5 py-3.5">{PAYMENT_TYPE_LABELS[p.type]}</td>
            <td className="px-5 py-3.5 font-semibold">{money(p.amount)}</td>
            <td className="px-5 py-3.5">
              {p.credit ? (
                <>
                  Inicial {money(p.credit.downPayment ?? 0)}
                  <div className="text-xs text-slate-500">Resta {money(p.credit.balance)}</div>
                </>
              ) : "—"}
            </td>
            <td className="px-5 py-3.5">{formatDate(p.createdAt)}</td>
            <td className="px-5 py-3.5">
              {!p.voidedAt && p.type !== "AFFILIATION" ? (
                <RowActions onDeactivate={() => setVoiding(p)} deactivateLabel="Anular" />
              ) : p.voidedAt ? (
                <span className="text-xs font-medium text-rose-700">Anulado</span>
              ) : "—"}
            </td>
          </tr>
        ))}
      </DataTable>
      {voiding && (
        <ConfirmModal
          title="Anular pago"
          message="Vas a anular"
          itemName={voiding.code}
          confirmText="Anular pago"
          loadingText="Anulando..."
          loading={voidPayment.isPending}
          error={voidPayment.error instanceof Error ? voidPayment.error.message : undefined}
          requireReason
          reasonLabel="Motivo de anulación"
          consequences={[
            "El pago no se borra: queda marcado como anulado",
            "Las cuotas cubiertas vuelven a pendiente",
            "El saldo del crédito sube otra vez",
            "La afiliación no se puede anular desde aquí",
          ]}
          onClose={() => setVoiding(null)}
          onConfirm={(reason) => voidPayment.mutate({ id: voiding.id, reason: reason ?? "" })}
        />
      )}
      </div>
    </div>
  );
}
