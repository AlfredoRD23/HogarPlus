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
import { CATEGORY_LABELS, CATALOG_TIERS, firstError, integerError, moneyError, parseInteger, parseMoney, productNameError, type CatalogTier, type ProductCategory } from "@hogarplus/shared";
import { CatalogBadge } from "../components/Badges";
import { CatalogTierTabs, type CatalogTierFilter } from "../components/CatalogTierTabs";
import { StatusTabs } from "../components/StatusTabs";
import { WaitLabel } from "../components/Loader";
import { useOnceSubmit } from "../hooks/useOnceSubmit";

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

function ProductCard({
  product,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete: () => void;
}) {
  const cover = coverOf(product);
  return (
    <article className="panel overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        {cover ? (
          <img src={mediaUrl(cover)} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Package size={28} />
            <span className="mt-2 text-xs">Sin foto</span>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <CatalogBadge tier={product.catalogTier} />
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs text-slate-400">{product.sku} · {CATEGORY_LABELS[product.category]}</p>
          <h3 className="font-display text-xl leading-tight">{product.name}</h3>
          {product.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p> : null}
        </div>
        <div>
          <p className="font-display text-2xl">{money(product.price)}</p>
          <p className="text-xs text-slate-500">Costo {money(product.cost)} · Stock {product.stock}</p>
        </div>
        <RowActions
          active={product.status === "ACTIVE"}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onActivate={onActivate}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

export function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirm, setConfirm] = useState<{ product: Product; kind: "activate" | "deactivate" | "delete" } | null>(null);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<CatalogTierFilter>("ALL");
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
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
      toast.success(confirm?.kind === "activate" ? "Producto reactivado" : "Producto desactivado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Producto eliminado");
      qc.invalidateQueries({ queryKey: ["products"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allProducts = q.data?.data ?? [];
  const rows = allProducts.filter((p) => (tier === "ALL" ? true : p.catalogTier === tier));
  const activeRows = rows.filter((p) => p.status === "ACTIVE");
  const inactiveRows = rows.filter((p) => p.status !== "ACTIVE");
  const visible = statusTab === "ACTIVE" ? activeRows : inactiveRows;
  const tierCounts = {
    ALL: allProducts.length,
    A: allProducts.filter((p) => p.catalogTier === "A").length,
    B: allProducts.filter((p) => p.catalogTier === "B").length,
    C: allProducts.filter((p) => p.catalogTier === "C").length,
  };

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
      <CatalogTierTabs value={tier} onChange={setTier} counts={tierCounts} />
      <StatusTabs
        value={statusTab}
        onChange={setStatusTab}
        activeCount={activeRows.length}
        inactiveCount={inactiveRows.length}
      />
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-80 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-display text-xl">{statusTab === "ACTIVE" ? "Sin productos activos" : "Sin productos inactivos"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {statusTab === "ACTIVE" ? "Agrega un producto o reactívalo en Inactivos." : "Los que desactives aparecen aquí."}
          </p>
          {statusTab === "ACTIVE" ? (
            <button className="btn-primary mt-4" onClick={() => setOpen(true)}>Nuevo producto</button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => setEditing(p)}
              onDeactivate={p.status === "ACTIVE" ? () => setConfirm({ product: p, kind: "deactivate" }) : undefined}
              onActivate={p.status !== "ACTIVE" ? () => setConfirm({ product: p, kind: "activate" }) : undefined}
              onDelete={() => setConfirm({ product: p, kind: "delete" })}
            />
          ))}
        </div>
      )}
      {open && (
        <Modal title="Nuevo producto" onClose={() => setOpen(false)} size="lg">
          <ProductForm saving={create.isPending} onCancel={() => setOpen(false)} onSave={(body, files) => create.mutate({ body, files })} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar producto" onClose={() => setEditing(null)} size="lg">
          <ProductForm
            initial={editing}
            saving={update.isPending}
            onCancel={() => setEditing(null)}
            onSave={(body, files) => update.mutate({ id: editing.id, body, files })}
          />
        </Modal>
      )}
      {confirm && (
        <ConfirmModal
          title={
            confirm.kind === "activate"
              ? "Reactivar producto"
              : confirm.kind === "delete"
                ? "Eliminar producto"
                : "Desactivar producto"
          }
          message={
            confirm.kind === "activate"
              ? "Vas a reactivar"
              : confirm.kind === "delete"
                ? "Vas a eliminar"
                : "Vas a desactivar"
          }
          itemName={confirm.product.name}
          confirmText={
            confirm.kind === "activate" ? "Reactivar" : confirm.kind === "delete" ? "Eliminar" : "Desactivar"
          }
          loading={confirm.kind === "delete" ? remove.isPending : toggle.isPending}
          irreversible={confirm.kind === "delete"}
          error={
            (confirm.kind === "delete" ? remove.error : toggle.error) instanceof Error
              ? ((confirm.kind === "delete" ? remove.error : toggle.error) as Error).message
              : undefined
          }
          consequences={
            confirm.kind === "activate"
              ? ["Volverá a verse en el catálogo y se podrá entregar otra vez"]
              : confirm.kind === "delete"
                ? [
                    "Se borra del catálogo",
                    "Si ya se entregó a un cliente, no se puede borrar",
                    "Esto no se puede deshacer",
                  ]
                : [
                    "No se borra el producto ni el kardex",
                    "Los créditos ya entregados se quedan igual",
                    "Nadie podrá solicitarlo ni entregarlo de nuevo",
                    "Puedes reactivarlo cuando quieras",
                  ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === "delete") {
              remove.mutate(confirm.product.id);
              return;
            }
            toggle.mutate({
              id: confirm.product.id,
              status: confirm.kind === "activate" ? "ACTIVE" : "INACTIVE",
            });
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  onSave,
  onCancel,
  initial,
  saving,
}: {
  onSave: (b: Record<string, unknown>, files: File[]) => void;
  onCancel: () => void;
  initial?: Product;
  saving?: boolean;
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
  const submit = useOnceSubmit(saving);
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
        submit.guard(() => onSave(
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
        ));
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
        <div className="flex flex-wrap gap-2">
          {CATALOG_TIERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full ${f.catalogTier === item ? "ring-2 ring-navy-900 ring-offset-2" : "opacity-70 hover:opacity-100"}`}
              onClick={() => set("catalogTier", item)}
            >
              <CatalogBadge tier={item} />
            </button>
          ))}
        </div>
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
        <button type="button" className="btn-ghost" disabled={submit.blocked} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={submit.blocked}>
          <WaitLabel waiting={submit.blocked} idle="Guardar" busy="Guardando..." />
        </button>
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
