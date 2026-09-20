import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { Field, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { Plus, Receipt } from "lucide-react";

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
        emptyDescription="Registra operación, transporte u otros costos reales."
        emptyAction={<button className="btn-gold" onClick={() => setOpen(true)}>Nuevo gasto</button>}
        headers={["Fecha", "Categoría", "Descripción", "Monto"]}
      >
        {rows.map((e) => (
          <tr key={e.id} className="border-t">
            <td className="px-4 py-3">{formatDate(e.incurredOn)}</td>
            <td className="px-4 py-3">{e.category}</td>
            <td className="px-4 py-3">{e.description}</td>
            <td className="px-4 py-3 text-right font-semibold">{money(e.amount)}</td>
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
  const [f, setF] = useState({
    category: "OPERATIONS",
    amount: 0,
    description: "",
    incurredOn: new Date().toISOString().slice(0, 10),
  });
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(f);
      }}
    >
      <Field label="Categoría">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Monto"><input className="input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
      <Field label="Descripción"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Fecha"><input className="input" type="date" value={f.incurredOn} onChange={(e) => setF({ ...f, incurredOn: e.target.value })} /></Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
