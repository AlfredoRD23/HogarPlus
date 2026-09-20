import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money } from "../lib/api";
import { Field, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { Package, Plus } from "lucide-react";
import { CATEGORY_LABELS, type CatalogTier, type ProductCategory } from "@hogarplus/shared";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  catalogTier: CatalogTier;
  cost: number;
  price: number;
  stock: number;
  status: string;
};

export function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["products", search],
    queryFn: () => api<Product[]>(`/api/products?pageSize=100&search=${encodeURIComponent(search)}`),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/products", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Producto creado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo"
        description="Tres áreas y tres niveles: A, B y C"
        icon={Package}
        searchPlaceholder="Buscar producto o SKU"
        searchValue={search}
        onSearchChange={setSearch}
        actions={[{ label: "Nuevo producto", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <DataTable
        title="Productos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Catálogo vacío"
        emptyDescription="Carga el primer producto con costo y precio reales."
        emptyAction={<button className="btn-gold" onClick={() => setOpen(true)}>Nuevo producto</button>}
        headers={["SKU", "Producto", "Área", "Catálogo", "Costo", "Precio", "Stock"]}
      >
        {rows.map((p) => (
          <tr key={p.id} className="border-t">
            <td className="px-4 py-3">{p.sku}</td>
            <td className="px-4 py-3 font-semibold">{p.name}</td>
            <td className="px-4 py-3">{CATEGORY_LABELS[p.category]}</td>
            <td className="px-4 py-3">{p.catalogTier}</td>
            <td className="px-4 py-3">{money(p.cost)}</td>
            <td className="px-4 py-3">{money(p.price)}</td>
            <td className="px-4 py-3">{p.stock}</td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <Modal title="Nuevo producto" onClose={() => setOpen(false)}>
          <ProductForm onCancel={() => setOpen(false)} onSave={(b) => create.mutate(b)} />
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ onSave, onCancel }: { onSave: (b: Record<string, unknown>) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: "",
    category: "HOGAR",
    catalogTier: "A",
    cost: 0,
    price: 0,
    stock: 0,
  });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(f);
      }}
    >
      <Field label="Nombre"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Categoría">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="SALUD_BIENESTAR">Salud</option>
          <option value="BELLEZA">Belleza</option>
          <option value="HOGAR">Hogar</option>
        </select>
      </Field>
      <Field label="Catálogo">
        <select className="input" value={f.catalogTier} onChange={(e) => setF({ ...f, catalogTier: e.target.value })}>
          <option>A</option><option>B</option><option>C</option>
        </select>
      </Field>
      <Field label="Costo"><input className="input" type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} /></Field>
      <Field label="Precio"><input className="input" type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
      <Field label="Stock inicial"><input className="input" type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} /></Field>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
