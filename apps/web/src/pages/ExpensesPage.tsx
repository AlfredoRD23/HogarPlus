import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
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
    queryFn: () => api<Array<{ id: string; category: string; amount: number; description: string; incurredOn: string }>>("/api/expenses"),
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
        emptyAction={<button className="btn-gold" onClick={() => setOpen(true)}>Nuevo gasto</button>}
        headers={["Fecha", "Categoría", "Descripción", "Monto"]}
      >
        {rows.map((e) => (
          <tr key={e.id} className="border-t">
            <td className="px-5 py-3.5">{formatDate(e.incurredOn)}</td>
            <td className="px-5 py-3.5">{CATEGORIES.find(([key]) => key === e.category)?.[1] ?? e.category}</td>
            <td className="px-5 py-3.5">{e.description}</td>
            <td className="px-5 py-3.5 text-right font-semibold">{money(e.amount)}</td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <Modal title="Registrar gasto" onClose={() => setOpen(false)}>
          <ExpenseForm onCancel={() => setOpen(false)} onSave={(b) => create.mutate(b)} />
        </Modal>
      )}
    </div>
  );
}

function ExpenseForm({ onSave, onCancel }: { onSave: (b: Record<string, unknown>) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    category: "OPERATIONS",
    amount: "",
    description: "",
    incurredOn: today,
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
        const message = firstError(Object.values(next));
        if (message) {
          toast.error(message);
          return;
        }
        onSave({
          category: f.category,
          amount: parseMoney(f.amount),
          description: f.description.trim(),
          incurredOn: f.incurredOn,
        });
      }}
    >
      <Field label="Categoría">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Monto" hint={fieldHint("money")} error={errors.amount}>
        <FormattedInput kind="money" required value={f.amount} error={Boolean(errors.amount)} onValue={(v) => setF({ ...f, amount: v })} />
      </Field>
      <Field label="Descripción" hint={fieldHint("note")} error={errors.description}>
        <FormattedInput kind="text" required value={f.description} error={Boolean(errors.description)} onValue={(v) => setF({ ...f, description: v })} />
      </Field>
      <Field label="Fecha" hint="No puede ser futura" error={errors.incurredOn}>
        <FormattedInput kind="date" required max={today} value={f.incurredOn} error={Boolean(errors.incurredOn)} onValue={(v) => setF({ ...f, incurredOn: v })} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
