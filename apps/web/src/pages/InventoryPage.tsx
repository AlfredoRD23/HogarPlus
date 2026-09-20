import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money, formatDate } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { TableCard } from "../components/TableCard";
import { WaitLabel } from "../components/Loader";
import { Plus, Warehouse } from "lucide-react";
import { firstError, INVENTORY_MOVEMENT_LABELS, integerError, noteError, parseInteger, type InventoryMovementType } from "@hogarplus/shared";
import { useOnceSubmit } from "../hooks/useOnceSubmit";

type InventoryPayload = {
  movements: Array<{
    id: string;
    type: InventoryMovementType;
    quantity: number;
    reason?: string;
    createdAt: string;
    product: { sku: string; name: string };
    user: { name: string };
  }>;
  summary: Array<{ id: string; sku: string; name: string; stock: number; minStock: number; cost: number }>;
};

export function InventoryPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api<InventoryPayload>("/api/inventory?pageSize=40"),
  });
  const move = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/inventory", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Movimiento registrado");
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = q.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        description="Entradas, salidas y stock valorizado al costo"
        icon={Warehouse}
        actions={[{ label: "Registrar movimiento", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <DataTable
        title="Stock por producto"
        count={(data?.summary ?? []).length}
        loading={q.isLoading}
        rows={(data?.summary ?? []).length}
        emptyTitle="Sin inventario"
        emptyDescription="Carga productos para ver el stock valorizado."
        headers={["Producto", "Stock", "Mínimo", "Valor costo"]}
        mobile={(data?.summary ?? []).map((p) => (
          <TableCard
            key={p.id}
            title={p.name}
            subtitle={p.sku}
            initials={p.name}
            fields={[
              { label: "Stock", value: p.stock },
              { label: "Mínimo", value: p.minStock },
              { label: "Valor costo", value: money(Number(p.cost) * p.stock) },
            ]}
          />
        ))}
      >
        {(data?.summary ?? []).map((p) => (
          <tr key={p.id} className="border-t">
            <td className="px-5 py-3.5">{p.name} <span className="text-slate-400">{p.sku}</span></td>
            <td className="px-5 py-3.5">{p.stock}</td>
            <td className="px-5 py-3.5">{p.minStock}</td>
            <td className="px-5 py-3.5">{money(Number(p.cost) * p.stock)}</td>
          </tr>
        ))}
      </DataTable>
      <DataTable
        title="Kardex reciente"
        count={(data?.movements ?? []).length}
        loading={q.isLoading}
        rows={(data?.movements ?? []).length}
        emptyTitle="Sin movimientos"
        emptyDescription="Los movimientos de entrada y salida aparecen aquí."
        headers={["Fecha", "Producto", "Tipo", "Cantidad", "Motivo"]}
        mobile={(data?.movements ?? []).map((m) => (
          <TableCard
            key={m.id}
            title={m.product.name}
            subtitle={m.product.sku}
            initials={m.product.name}
            fields={[
              { label: "Fecha", value: formatDate(m.createdAt) },
              { label: "Tipo", value: INVENTORY_MOVEMENT_LABELS[m.type] },
              { label: "Cantidad", value: m.quantity },
              { label: "Motivo", value: m.reason || "—" },
            ]}
          />
        ))}
      >
        {(data?.movements ?? []).map((m) => (
          <tr key={m.id} className="border-t">
            <td className="px-5 py-3.5">{formatDate(m.createdAt)}</td>
            <td className="px-5 py-3.5">{m.product.name}</td>
            <td className="px-5 py-3.5">{INVENTORY_MOVEMENT_LABELS[m.type]}</td>
            <td className="px-5 py-3.5">{m.quantity}</td>
            <td className="px-5 py-3.5 text-slate-500">{m.reason}</td>
          </tr>
        ))}
      </DataTable>
      {open && data && (
        <Modal title="Movimiento de inventario" onClose={() => setOpen(false)}>
          <MoveForm saving={move.isPending} products={data.summary} onCancel={() => setOpen(false)} onSave={(b) => move.mutate(b)} />
        </Modal>
      )}
    </div>
  );
}

function MoveForm({
  products,
  onSave,
  onCancel,
  saving,
}: {
  products: InventoryPayload["summary"];
  onSave: (b: Record<string, unknown>) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [f, setF] = useState({ productId: products[0]?.id ?? "", type: "IN", quantity: "1", reason: "Reposición" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useOnceSubmit(saving);
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const next = {
          productId: f.productId ? "" : "Selecciona un producto",
          quantity: integerError(f.quantity, { min: f.type === "ADJUSTMENT" ? 0 : 1, label: "cantidad" }) ?? "",
          reason: noteError(f.reason, { min: 2, label: "motivo" }) ?? "",
        };
        setErrors(next);
        const message = firstError(Object.values(next));
        if (message) {
          toast.error(message);
          return;
        }
        submit.guard(() => onSave({
          productId: f.productId,
          type: f.type,
          quantity: parseInteger(f.quantity),
          reason: f.reason.trim(),
        }));
      }}
    >
      <Field label="Producto" error={errors.productId} required>
        <select className={`input ${errors.productId ? "input-error" : ""}`} value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
          <option value="">Seleccione</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Tipo" required>
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="IN">Entrada</option>
          <option value="OUT">Salida</option>
          <option value="ADJUSTMENT">Ajuste a cantidad absoluta</option>
        </select>
      </Field>
      <Field label="Cantidad" hint={fieldHint("integer")} error={errors.quantity} required>
        <FormattedInput kind="integer" required value={f.quantity} error={Boolean(errors.quantity)} onValue={(v) => setF({ ...f, quantity: v })} />
      </Field>
      <Field label="Motivo" hint="Mínimo 2 caracteres" error={errors.reason} required>
        <FormattedInput kind="text" required value={f.reason} error={Boolean(errors.reason)} onValue={(v) => setF({ ...f, reason: v })} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" disabled={submit.blocked} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={submit.blocked}>
          <WaitLabel waiting={submit.blocked} idle="Guardar" busy="Guardando..." />
        </button>
      </div>
    </form>
  );
}
