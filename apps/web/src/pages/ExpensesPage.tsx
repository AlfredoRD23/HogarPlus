import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { RowActions } from "../components/RowActions";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { TableCard } from "../components/TableCard";
import { WaitLabel } from "../components/Loader";
import { Plus, Receipt } from "lucide-react";
import { dateError, firstError, moneyError, noteError, parseMoney } from "@hogarplus/shared";

const CATEGORIES = [
  ["PAYROLL", "Nómina"],
  ["TRANSPORT", "Transporte"],
  ["MARKETING", "Publicidad"],
  ["PROCESSING", "Procesamiento"],
  ["WARRANTY", "Garantías"],
  ["TAX", "Impuestos"],
  ["OPERATIONS", "Operación"],
  ["OTHER", "Otros"],
] as const;

export function ExpensesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api<Array<{ id: string; category: string; amount: number; description: string; incurredOn: string; voidedAt?: string | null }>>("/api/expenses"),
  });
  const [editing, setEditing] = useState<{ id: string; category: string; amount: number; description: string; incurredOn: string } | null>(null);
  const [voiding, setVoiding] = useState<{ id: string; description: string } | null>(null);
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Gasto actualizado");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const voidExpense = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/expenses/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      toast.success("Gasto anulado");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setVoiding(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/expenses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Gasto registrado");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gastos"
        description="Separados del cobro y del costo de mercancía"
        icon={Receipt}
        actions={[{ label: "Nuevo gasto", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <DataTable
        title="Movimientos de gasto"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin gastos"
        emptyDescription="Registra nómina, transporte u otros gastos."
        emptyAction={<button className="btn-primary" onClick={() => setOpen(true)}>Nuevo gasto</button>}
        headers={["Fecha", "Categoría", "Descripción", "Monto", "Acciones"]}
        mobile={rows.map((e) => (
          <TableCard
            key={e.id}
            title={CATEGORIES.find(([key]) => key === e.category)?.[1] ?? e.category}
            subtitle={formatDate(e.incurredOn)}
            initials={e.category}
            muted={Boolean(e.voidedAt)}
            badge={e.voidedAt ? <span className="text-[11px] font-bold uppercase text-rose-700">Anulado</span> : null}
            fields={[
              { label: "Descripción", value: e.description },
              { label: "Monto", value: money(e.amount) },
            ]}
            actions={
              !e.voidedAt ? (
                <RowActions
                  onEdit={() => setEditing(e)}
                  onDeactivate={() => setVoiding({ id: e.id, description: e.description })}
                  deactivateLabel="Anular"
                />
              ) : undefined
            }
          />
        ))}
      >
        {rows.map((e) => (
          <tr key={e.id} className={`border-t ${e.voidedAt ? "opacity-40" : ""}`}>
            <td className="px-5 py-3.5">{formatDate(e.incurredOn)}</td>
            <td className="px-5 py-3.5">{CATEGORIES.find(([key]) => key === e.category)?.[1] ?? e.category}</td>
            <td className="px-5 py-3.5">{e.description}{e.voidedAt ? " · anulado" : ""}</td>
            <td className="px-5 py-3.5 text-right font-semibold">{money(e.amount)}</td>
            <td className="px-5 py-3.5">
              {!e.voidedAt ? (
                <RowActions
                  onEdit={() => setEditing(e)}
                  onDeactivate={() => setVoiding({ id: e.id, description: e.description })}
                  deactivateLabel="Anular"
                />
              ) : "—"}
            </td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <Modal title="Registrar gasto" onClose={() => setOpen(false)}>
          <ExpenseForm saving={create.isPending} onCancel={() => setOpen(false)} onSave={(b) => create.mutate(b)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar gasto" onClose={() => setEditing(null)}>
          <ExpenseForm saving={update.isPending} initial={editing} onCancel={() => setEditing(null)} onSave={(b) => update.mutate({ id: editing.id, body: b })} />
        </Modal>
      )}
      {voiding && (
        <ConfirmModal
          title="Anular gasto"
          message="Vas a anular"
          itemName={voiding.description}
          confirmText="Anular"
          loading={voidExpense.isPending}
          error={voidExpense.error instanceof Error ? voidExpense.error.message : undefined}
          requireReason
          consequences={[
            "El gasto no se borra: queda anulado",
            "Deja de contar en reportes",
            "No afecta clientes, créditos ni pagos",
          ]}
          onClose={() => setVoiding(null)}
          onConfirm={(reason) => voidExpense.mutate({ id: voiding.id, reason: reason ?? "" })}
        />
      )}
    </div>
  );
}

function ExpenseForm({
  onSave,
  onCancel,
  initial,
  saving,
}: {
  onSave: (b: Record<string, unknown>) => void;
  onCancel: () => void;
  initial?: { category: string; amount: number; description: string; incurredOn: string };
  saving?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    category: initial?.category ?? "OPERATIONS",
    amount: initial ? String(initial.amount) : "",
    description: initial?.description ?? "",
    incurredOn: initial ? initial.incurredOn.slice(0, 10) : today,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const next = {
          amount: moneyError(f.amount, { label: "monto" }) ?? "",
          description: noteError(f.description, { min: 3, label: "descripción" }) ?? "",
          incurredOn: dateError(f.incurredOn) ?? "",
        };
        setErrors(next);
        if (firstError(Object.values(next))) return;
        onSave({
          category: f.category,
          amount: parseMoney(f.amount),
          description: f.description.trim(),
          incurredOn: f.incurredOn,
        });
      }}
    >
      <Field label="Categoría" required>
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Monto" hint={fieldHint("money")} error={errors.amount} required>
        <FormattedInput kind="money" required value={f.amount} error={Boolean(errors.amount)} onValue={(v) => setF({ ...f, amount: v })} />
      </Field>
      <Field label="Descripción" hint={fieldHint("note")} error={errors.description} required>
        <FormattedInput kind="text" required value={f.description} error={Boolean(errors.description)} onValue={(v) => setF({ ...f, description: v })} />
      </Field>
      <Field label="Fecha" hint="No puede ser futura" error={errors.incurredOn} required>
        <FormattedInput kind="date" required max={today} value={f.incurredOn} error={Boolean(errors.incurredOn)} onValue={(v) => setF({ ...f, incurredOn: v })} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>
          <WaitLabel waiting={saving} idle="Guardar" busy="Guardando..." />
        </button>
      </div>
    </form>
  );
}
