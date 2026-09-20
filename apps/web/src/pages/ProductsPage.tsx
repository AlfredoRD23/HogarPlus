import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { Package, Plus } from "lucide-react";
import { CATEGORY_LABELS, CATALOG_TIER_LABELS, CATALOG_TIERS, firstError, integerError, moneyError, parseInteger, parseMoney, productNameError, type CatalogTier, type ProductCategory } from "@hogarplus/shared";
import { CatalogBadge } from "../components/Badges";

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
  const [tier, setTier] = useState<CatalogTier | "ALL">("ALL");
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

  const rows = (q.data?.data ?? []).filter((p) => (tier === "ALL" ? true : p.catalogTier === tier));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo"
        description="Productos por nivel: Bronce, Plata y Oro. El cliente solo ve los de su categoría."
        icon={Package}
        searchPlaceholder="Buscar producto o SKU"
        searchValue={search}
        onSearchChange={setSearch}
        actions={[{ label: "Nuevo producto", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <div className="flex flex-wrap gap-2">
        <button className={tier === "ALL" ? "btn-primary" : "btn-ghost"} onClick={() => setTier("ALL")}>Todos</button>
        {CATALOG_TIERS.map((item) => (
          <button key={item} className={tier === item ? "btn-primary" : "btn-ghost"} onClick={() => setTier(item)}>
            {CATALOG_TIER_LABELS[item]}
          </button>
        ))}
      </div>
      <DataTable
        title="Productos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Catálogo vacío"
        emptyDescription="Agrega el primer producto al catálogo."
        emptyAction={<button className="btn-gold" onClick={() => setOpen(true)}>Nuevo producto</button>}
        headers={["SKU", "Producto", "Área", "Nivel", "Costo", "Precio", "Stock"]}
      >
        {rows.map((p) => (
          <tr key={p.id} className="border-t">
            <td className="px-5 py-3.5">{p.sku}</td>
            <td className="px-5 py-3.5 font-semibold">{p.name}</td>
            <td className="px-5 py-3.5">{CATEGORY_LABELS[p.category]}</td>
            <td className="px-5 py-3.5"><CatalogBadge tier={p.catalogTier} /></td>
            <td className="px-5 py-3.5">{money(p.cost)}</td>
            <td className="px-5 py-3.5">{money(p.price)}</td>
            <td className="px-5 py-3.5">{p.stock}</td>
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
    cost: "",
    price: "",
    stock: "0",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof f, value: string) => {
    setF((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const next = {
          name: productNameError(f.name) ?? "",
          cost: moneyError(f.cost, { label: "costo" }) ?? "",
          price: moneyError(f.price, { label: "precio" }) ?? "",
          stock: integerError(f.stock, { min: 0, label: "cantidad" }) ?? "",
        };
        setErrors(next);
        const message = firstError(Object.values(next));
        if (message) {
          toast.error(message);
          return;
        }
        onSave({
          name: f.name.trim(),
          category: f.category,
          catalogTier: f.catalogTier,
          cost: parseMoney(f.cost),
          price: parseMoney(f.price),
          stock: parseInteger(f.stock),
        });
      }}
    >
      <Field label="Nombre" hint={fieldHint("productName")} error={errors.name}>
        <FormattedInput kind="productName" required value={f.name} error={Boolean(errors.name)} onValue={(v) => set("name", v)} />
      </Field>
      <Field label="Categoría">
        <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
          <option value="SALUD_BIENESTAR">Salud</option>
          <option value="BELLEZA">Belleza</option>
          <option value="HOGAR">Hogar</option>
        </select>
      </Field>
      <Field label="Nivel del catálogo">
        <select className="input" value={f.catalogTier} onChange={(e) => set("catalogTier", e.target.value)}>
          <option value="A">Bronce</option>
          <option value="B">Plata</option>
          <option value="C">Oro</option>
        </select>
      </Field>
      <Field label="Costo" hint={fieldHint("money")} error={errors.cost}>
        <FormattedInput kind="money" required value={f.cost} error={Boolean(errors.cost)} onValue={(v) => set("cost", v)} />
      </Field>
      <Field label="Precio" hint={fieldHint("money")} error={errors.price}>
        <FormattedInput kind="money" required value={f.price} error={Boolean(errors.price)} onValue={(v) => set("price", v)} />
      </Field>
      <Field label="Stock inicial" hint={fieldHint("integer")} error={errors.stock}>
        <FormattedInput kind="integer" value={f.stock} error={Boolean(errors.stock)} onValue={(v) => set("stock", v)} />
      </Field>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
