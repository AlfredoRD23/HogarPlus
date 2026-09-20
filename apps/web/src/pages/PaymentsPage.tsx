import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { Wallet } from "lucide-react";
import { PAYMENT_METHOD_LABELS, firstError, moneyError, parseMoney, referenceError, type PaymentMethod } from "@hogarplus/shared";

type Payment = {
  id: string;
  code: string;
  amount: number;
  method: PaymentMethod;
  type: string;
  createdAt: string;
  voidedAt?: string | null;
  client: { firstName: string; lastName: string };
  credit?: { code: string } | null;
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
        description="El cobro se aplica al saldo y a las cuotas. No se trata como utilidad."
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
          if (message) {
            toast.error(message);
            return;
          }
          create.mutate();
        }}
      >
        <h2 className="font-display text-2xl">Registrar pago</h2>
        <p className="text-xs text-slate-500">El sistema aplica FIFO a cuotas, marca adelantos y no trata el cobro como utilidad.</p>
        <Field label="Cliente" error={errors.clientId}>
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
        <Field label="Monto" hint={fieldHint("money")} error={errors.amount}>
          <FormattedInput kind="money" required value={form.amount} error={Boolean(errors.amount)} onValue={(v) => setForm({ ...form, amount: v })} />
        </Field>
        <Field label="Método">
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="DEPOSIT">Depósito</option>
          </select>
        </Field>
        <Field label="Referencia" hint={form.method === "CASH" ? "Opcional en efectivo" : fieldHint("reference")} error={errors.reference}>
          <FormattedInput kind="reference" value={form.reference} error={Boolean(errors.reference)} onValue={(v) => setForm({ ...form, reference: v })} />
        </Field>
        <button className="btn-primary w-full">Aplicar pago</button>
      </form>
      <DataTable
        title="Historial de pagos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin pagos"
        emptyDescription="Los cobros aparecerán aquí al registrar la primera cuota."
        headers={["Código", "Cliente", "Monto", "Método", "Tipo", "Fecha"]}
      >
        {rows.map((p) => (
          <tr key={p.id} className={`border-t ${p.voidedAt ? "opacity-40" : ""}`}>
            <td className="px-4 py-3">{p.code}</td>
            <td className="px-4 py-3">{p.client.firstName} {p.client.lastName}</td>
            <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
            <td className="px-4 py-3">{PAYMENT_METHOD_LABELS[p.method]}</td>
            <td className="px-4 py-3">{p.type}</td>
            <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
          </tr>
        ))}
      </DataTable>
      </div>
    </div>
  );
}
