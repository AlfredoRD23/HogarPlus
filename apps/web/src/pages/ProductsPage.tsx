import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, mediaUrl, money } from "../lib/api";
import { Field, FormattedInput, FormattedTextarea, Modal, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { ImagePicker, MAX_PRODUCT_IMAGES } from "../components/ImagePicker";
import { RowActions } from "../components/RowActions";
import { PageHeader } from "../components/PageHeader";
import { Package, Plus } from "lucide-react";
import { CATEGORY_LABELS, CATALOG_TIER_LABELS, CATALOG_TIERS, firstError, integerError, moneyError, parseInteger, parseMoney, productNameError, type CatalogTier, type ProductCategory } from "@hogarplus/shared";
import { CatalogBadge } from "../components/Badges";

type ProductImage = { id: string; path: string };

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category: ProductCategory;
  catalogTier: CatalogTier;
  cost: number;
  price: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  imageUrl?: string | null;
  images?: ProductImage[];
  _count?: { credits: number };
};

async function uploadProductImages(productId: string, files: File[]) {
  if (files.length === 0) return;
  const body = new FormData();
  files.forEach((file) => body.append("images", file));
  await api(`/api/products/${productId}/images`, { method: "POST", body });
}

function coverOf(product: Product) {
  return product.imageUrl || product.images?.[0]?.path || "";
}

export function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirm, setConfirm] = useState<{ product: Product; activate: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<CatalogTier | "ALL">("ALL");
  const q = useQuery({
    queryKey: ["products", search],
    queryFn: () => api<Product[]>(`/api/products?pageSize=100&search=${encodeURIComponent(search)}`),
  });
  const create = useMutation({
    mutationFn: async ({ body, files }: { body: Record<string, unknown>; files: File[] }) => {
      const created = await api<{ id: string }>("/api/products", { method: "POST", body: JSON.stringify(body) });
      await uploadProductImages(created.data.id, files);
      return created;
    },
    onSuccess: () => {
      toast.success("Producto creado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, body, files }: { id: string; body: Record<string, unknown>; files: File[] }) => {
      await api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await uploadProductImages(id, files);
    },
    onSuccess: () => {
      toast.success("Producto actualizado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      api(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success(confirm?.activate ? "Producto reactivado" : "Producto desactivado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data?.data ?? []).filter((p) => (tier === "ALL" ? true : p.catalogTier === tier));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo"
        description="Fotos, precio y nivel. El cliente solo pide los de su categoría."
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
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-80 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-display text-xl">Catálogo vacío</p>
          <p className="mt-1 text-sm text-slate-500">Agrega el primer producto con su foto.</p>
          <button className="btn-gold mt-4" onClick={() => setOpen(true)}>Nuevo producto</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const cover = coverOf(p);
            return (
              <article key={p.id} className={`panel overflow-hidden ${p.status !== "ACTIVE" ? "opacity-70" : ""}`}>
                <div className="relative h-48 bg-slate-100">
                  {cover ? (
                    <img src={mediaUrl(cover)} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <Package size={28} />
                      <span className="mt-2 text-xs">Sin foto</span>
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <CatalogBadge tier={p.catalogTier} />
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <p className="text-xs text-slate-400">{p.sku} · {CATEGORY_LABELS[p.category]}</p>
                    <h3 className="font-display text-xl leading-tight">{p.name}</h3>
                    {p.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p> : null}
                    {p.status !== "ACTIVE" ? <p className="mt-1 text-[11px] font-bold uppercase text-rose-700">Inactivo</p> : null}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl">{money(p.price)}</p>
                      <p className="text-xs text-slate-500">Costo {money(p.cost)} · Stock {p.stock}</p>
                    </div>
                  </div>
                  <RowActions
                    active={p.status === "ACTIVE"}
                    onEdit={() => setEditing(p)}
                    onDeactivate={() => setConfirm({ product: p, activate: false })}
                    onActivate={() => setConfirm({ product: p, activate: true })}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
      {open && (
        <Modal title="Nuevo producto" onClose={() => setOpen(false)} size="lg">
          <ProductForm onCancel={() => setOpen(false)} onSave={(body, files) => create.mutate({ body, files })} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar producto" onClose={() => setEditing(null)} size="lg">
          <ProductForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSave={(body, files) => update.mutate({ id: editing.id, body, files })}
          />
        </Modal>
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.activate ? "Reactivar producto" : "Desactivar producto"}
          message={confirm.activate ? "Vas a reactivar" : "Vas a desactivar"}
          itemName={confirm.product.name}
          confirmText={confirm.activate ? "Reactivar" : "Desactivar"}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            confirm.activate
              ? ["Volverá a verse en el catálogo y se podrá entregar otra vez"]
              : [
                  "No se borra el producto ni el kardex",
                  "Los créditos ya entregados se quedan igual",
                  "Nadie podrá solicitarlo ni entregarlo de nuevo",
                  "Puedes reactivarlo cuando quieras",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => toggle.mutate({ id: confirm.product.id, status: confirm.activate ? "ACTIVE" : "INACTIVE" })}
        />
      )}
    </div>
  );
}

function ProductForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (b: Record<string, unknown>, files: File[]) => void;
  onCancel: () => void;
  initial?: Product;
}) {
  const editing = Boolean(initial);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "HOGAR",
    catalogTier: initial?.catalogTier ?? "A",
    cost: initial ? String(initial.cost) : "",
    price: initial ? String(initial.price) : "",
    stock: initial ? String(initial.stock) : "0",
  });
  const [pending, setPending] = useState<File[]>([]);
  const [savedImages, setSavedImages] = useState(initial?.images ?? []);
  const [removing, setRemoving] = useState<ProductImage | null>(null);
  const [removeError, setRemoveError] = useState<string | undefined>();
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
          stock: editing ? "" : integerError(f.stock, { min: 0, label: "cantidad" }) ?? "",
        };
        setErrors(next);
        if (firstError(Object.values(next))) return;
        onSave(
          {
            name: f.name.trim(),
            description: f.description.trim() || undefined,
            category: f.category,
            catalogTier: f.catalogTier,
            cost: parseMoney(f.cost),
            price: parseMoney(f.price),
            ...(editing ? {} : { stock: parseInteger(f.stock) }),
          },
          pending,
        );
      }}
    >
      <p className="sm:col-span-2 text-xs text-slate-400">Los campos con * son obligatorios. La foto es la cara del catálogo.</p>
      <Field label="Nombre" hint={fieldHint("productName")} error={errors.name} required>
        <FormattedInput kind="productName" required value={f.name} error={Boolean(errors.name)} onValue={(v) => set("name", v)} />
      </Field>
      <Field label="Categoría" required>
        <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
          <option value="SALUD_BIENESTAR">Salud</option>
          <option value="BELLEZA">Belleza</option>
          <option value="HOGAR">Hogar</option>
        </select>
      </Field>
      <Field label="Nivel del catálogo" required>
        <select className="input" value={f.catalogTier} onChange={(e) => set("catalogTier", e.target.value)}>
          <option value="A">Bronce</option>
          <option value="B">Plata</option>
          <option value="C">Oro</option>
        </select>
      </Field>
      <Field label="Costo" hint={fieldHint("money")} error={errors.cost} required>
        <FormattedInput kind="money" required value={f.cost} error={Boolean(errors.cost)} onValue={(v) => set("cost", v)} />
      </Field>
      <Field label="Precio" hint={fieldHint("money")} error={errors.price} required>
        <FormattedInput kind="money" required value={f.price} error={Boolean(errors.price)} onValue={(v) => set("price", v)} />
      </Field>
      {!editing && (
        <Field label="Stock inicial" hint={fieldHint("integer")} error={errors.stock} required>
          <FormattedInput kind="integer" required value={f.stock} error={Boolean(errors.stock)} onValue={(v) => set("stock", v)} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Descripción">
          <FormattedTextarea value={f.description} onValue={(v) => set("description", v)} placeholder="Qué es, para qué sirve, medida..." />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ImagePicker
          label="Fotos del catálogo"
          hint={`La primera es la portada. Máximo ${MAX_PRODUCT_IMAGES} fotos.`}
          max={MAX_PRODUCT_IMAGES}
          saved={savedImages}
          pending={pending}
          onAddFiles={(files) => setPending((current) => [...current, ...files])}
          onRemovePending={(index) => setPending((current) => current.filter((_, i) => i !== index))}
          onRemoveSaved={
            initial?.id
              ? (imageId) => {
                  const image = savedImages.find((item) => item.id === imageId);
                  if (image) {
                    setRemoveError(undefined);
                    setRemoving(image);
                  }
                }
              : undefined
          }
        />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
      {removing && initial?.id && (
        <ConfirmModal
          title="Quitar foto"
          message="Vas a quitar esta foto de"
          itemName={initial.name}
          confirmText="Quitar foto"
          loadingText="Quitando..."
          irreversible
          error={removeError}
          consequences={["Se borra del catálogo", "El portal deja de mostrarla"]}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            try {
              await api(`/api/products/${initial.id}/images/${removing.id}`, { method: "DELETE" });
              setSavedImages((current) => current.filter((item) => item.id !== removing.id));
              setRemoving(null);
            } catch (error) {
              setRemoveError(error instanceof Error ? error.message : "No se pudo quitar");
            }
          }}
        />
      )}
    </form>
  );
}
