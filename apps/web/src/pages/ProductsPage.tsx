import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, mediaUrl, money } from "../lib/api";
import { Field, FormattedInput, FormattedTextarea, Modal, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { ImagePicker, MAX_PRODUCT_IMAGES } from "../components/ImagePicker";
import { RowActions } from "../components/RowActions";
import { PageHeader } from "../components/PageHeader";
import { Package, Plus, Sparkles } from "lucide-react";
import {
  activeOffer,
  CATEGORY_LABELS,
  CATALOG_TIERS,
  firstError,
  integerError,
  isNewProduct,
  moneyError,
  OFFER_TYPE_LABELS,
  OFFER_TYPES,
  parseInteger,
  parseMoney,
  productNameError,
  type CatalogTier,
  type OfferType,
  type ProductCategory,
} from "@hogarplus/shared";
import { CatalogBadge } from "../components/Badges";
import { OfferCountdown, OfferDetail, OfferPrice, PromoBadges, type PromoInfo } from "../components/Promo";
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
  offerType?: OfferType | null;
  offerDiscount?: number | null;
  offerLabel?: string | null;
  offerEndsAt?: string | null;
  newUntil?: string | null;
};

type NewMode = "keep" | "none" | "7" | "15" | "30";

function promoOf(product: Product): PromoInfo {
  const offer = activeOffer(product);
  return { offer, isNew: isNewProduct(product), finalPrice: offer?.finalPrice ?? Number(product.price) };
}

function isoDay(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

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
  const promo = promoOf(product);
  return (
    <article className={`panel overflow-hidden ${promo.offer ? "promo-card promo-card-light" : ""}`}>
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
        <div className="absolute right-3 top-3">
          <PromoBadges promo={promo} />
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs text-slate-400">{product.sku} · {CATEGORY_LABELS[product.category]}</p>
          <h3 className="font-display text-xl leading-tight">{product.name}</h3>
          {product.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p> : null}
          {promo.offer ? <OfferDetail offer={promo.offer} /> : null}
        </div>
        <div>
          <div className="flex items-end justify-between gap-2">
            <OfferPrice price={product.price} promo={promo} size="lg" />
            {promo.offer ? <OfferCountdown endsAt={promo.offer.endsAt} /> : null}
          </div>
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
    offerType: (initial?.offerType ?? "") as OfferType | "",
    offerDiscount: initial?.offerDiscount ? String(initial.offerDiscount) : "",
    offerLabel: initial?.offerLabel ?? "",
    offerEndsAt: initial?.offerEndsAt ? isoDay(new Date(initial.offerEndsAt)) : "",
    newMode: (initial ? (isNewProduct(initial) ? "keep" : "none") : "15") as NewMode,
  });
  const discountValue = Math.round(Number(f.offerDiscount.replace(",", ".")) || 0);
  const priceValue = parseMoney(f.price) || 0;
  const previewPrice = f.offerType === "DISCOUNT" && discountValue > 0 && priceValue > 0
    ? Math.round(priceValue * (100 - discountValue)) / 100
    : null;
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
          offerDiscount:
            f.offerType === "DISCOUNT" && (discountValue < 1 || discountValue > 90)
              ? "El descuento debe estar entre 1% y 90%"
              : f.offerType === "DISCOUNT" && previewPrice !== null && previewPrice <= (parseMoney(f.cost) || 0)
                ? "Con ese descuento el precio queda por debajo del costo"
                : "",
          offerLabel:
            f.offerType === "GIFT" && !f.offerLabel.trim()
              ? "Escribe qué regalo incluye"
              : f.offerType === "PROMO" && !f.offerLabel.trim()
                ? "Escribe el texto de la promoción"
                : "",
        };
        setErrors(next);
        if (firstError(Object.values(next))) return;
        const newUntil =
          f.newMode === "keep" ? undefined : f.newMode === "none" ? null : addDays(Number(f.newMode));
        submit.guard(() => onSave(
          {
            name: f.name.trim(),
            description: f.description.trim() || undefined,
            category: f.category,
            catalogTier: f.catalogTier,
            cost: parseMoney(f.cost),
            price: parseMoney(f.price),
            ...(editing ? {} : { stock: parseInteger(f.stock) }),
            offerType: f.offerType || null,
            offerDiscount: f.offerType === "DISCOUNT" ? discountValue : null,
            offerLabel: f.offerType ? f.offerLabel.trim() || null : null,
            offerEndsAt: f.offerType && f.offerEndsAt ? f.offerEndsAt : null,
            ...(newUntil === undefined ? {} : { newUntil }),
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
      <section className="sm:col-span-2 rounded-2xl border border-gold-500/30 bg-gold-50/60 p-4">
        <div className="flex items-center gap-2">
          <span className="promo-float inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-navy-950">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Oferta y novedad</p>
            <p className="text-xs text-slate-500">Sale destacado con animación en el inicio y en el portal del cliente.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["", ...OFFER_TYPES] as const).map((type) => (
            <button
              key={type || "none"}
              type="button"
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                f.offerType === type
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-navy-300"
              }`}
              onClick={() => {
                set("offerType", type);
                setErrors((current) => ({ ...current, offerDiscount: "", offerLabel: "" }));
              }}
            >
              {type ? OFFER_TYPE_LABELS[type] : "Sin oferta"}
            </button>
          ))}
        </div>
        {f.offerType ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {f.offerType === "DISCOUNT" ? (
              <Field
                label="Descuento (%)"
                hint={previewPrice !== null ? `Queda en ${money(previewPrice)} (antes ${money(priceValue)})` : "Entre 1 y 90"}
                error={errors.offerDiscount}
                required
              >
                <FormattedInput
                  kind="percent"
                  required
                  value={f.offerDiscount}
                  error={Boolean(errors.offerDiscount)}
                  onValue={(v) => set("offerDiscount", v)}
                  placeholder="15"
                />
              </Field>
            ) : null}
            <Field
              label={f.offerType === "GIFT" ? "Qué regalo incluye" : f.offerType === "PROMO" ? "Texto de la promoción" : "Nota (opcional)"}
              hint={
                f.offerType === "GIFT"
                  ? "Ej: Juego de sábanas gratis"
                  : f.offerType === "PROMO"
                    ? "Ej: Sin pago inicial esta semana"
                    : "Ej: Solo este mes"
              }
              error={errors.offerLabel}
              required={f.offerType !== "DISCOUNT"}
            >
              <FormattedInput
                kind="text"
                value={f.offerLabel}
                error={Boolean(errors.offerLabel)}
                onValue={(v) => set("offerLabel", v)}
              />
            </Field>
            <Field label="Termina el" hint="Déjalo vacío si no tiene fecha de fin">
              <FormattedInput kind="date" value={f.offerEndsAt} min={isoDay(new Date())} onValue={(v) => set("offerEndsAt", v)} />
            </Field>
          </div>
        ) : null}
        <div className="mt-4">
          <Field label="Etiqueta «Nuevo»" hint="Se quita sola cuando pasan los días">
            <div className="flex flex-wrap gap-2">
              {([
                ...(editing && initial && isNewProduct(initial) ? [["keep", "Mantener"] as const] : []),
                ["none", "No"],
                ["7", "7 días"],
                ["15", "15 días"],
                ["30", "30 días"],
              ] as Array<readonly [NewMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    f.newMode === mode
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300"
                  }`}
                  onClick={() => set("newMode", mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </section>
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
