import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money, formatDate } from "../lib/api";
import { Field, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Plus, Warehouse } from "lucide-react";

type InventoryPayload = {
  movements: Array<{
    id: string;
    type: string;
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
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-900 text-xs uppercase text-gold-300">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Valor costo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.summary ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.name} <span className="text-slate-400">{p.sku}</span></td>
                <td className="px-4 py-3 text-center">{p.stock}</td>
                <td className="px-4 py-3 text-center">{p.minStock}</td>
                <td className="px-4 py-3 text-center">{money(Number(p.cost) * p.stock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel overflow-auto">
        <div className="border-b px-4 py-3 font-display text-lg">Kardex reciente</div>
        <table className="w-full text-sm">
          <tbody>
            {(data?.movements ?? []).map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3">{m.product.name}</td>
                <td className="px-4 py-3">{m.type}</td>
                <td className="px-4 py-3">{m.quantity}</td>
                <td className="px-4 py-3 text-slate-500">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && data && (
        <Modal title="Movimiento de inventario" onClose={() => setOpen(false)}>
          <MoveForm products={data.summary} onCancel={() => setOpen(false)} onSave={(b) => move.mutate(b)} />
        </Modal>
      )}
    </div>
  );
}

function MoveForm({
  products,
  onSave,
  onCancel,
}: {
  products: InventoryPayload["summary"];
  onSave: (b: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ productId: products[0]?.id ?? "", type: "IN", quantity: 1, reason: "Reposición" });
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(f);
      }}
    >
      <Field label="Producto">
        <select className="input" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Tipo">
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="IN">Entrada</option>
          <option value="OUT">Salida</option>
          <option value="ADJUSTMENT">Ajuste a cantidad absoluta</option>
        </select>
      </Field>
      <Field label="Cantidad"><input className="input" type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} /></Field>
      <Field label="Motivo"><input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
