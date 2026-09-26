import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Crown, Search, Trash2, X } from "lucide-react";
import {
  activeOffer,
  CATALOG_TIER_LABELS,
  OFFER_TYPES,
  OFFER_TYPE_LABELS,
  productRequestAccess,
  type ActiveOffer,
  type CatalogTier,
  type ClientLevel,
  type OfferType,
} from "@hogarplus/shared";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { Field, FormattedInput, Modal } from "./Form";
import { WaitLabel } from "./Loader";
import { ConfirmModal } from "./ConfirmModal";
import { LevelBadge } from "./Badges";

export type OfferClient = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  level: ClientLevel;
  catalogApproved: boolean;
};

export type OfferProduct = {
  id: string;
  name: string;
  price: number;
  cost?: number;
  catalogTier: CatalogTier;
  status?: string;
};

type ClientOfferItem = {
  id: string;
  offerType: OfferType;
  offerDiscount: number | null;
  offerLabel: string | null;
  offerEndsAt: string | null;
  createdAt: string;
  expired: boolean;
  offer: ActiveOffer | null;
  product: { id: string; name: string; price: number; imageUrl?: string | null };
};

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Santo_Domingo" });
}

/** Crea una oferta exclusiva para uno o varios clientes. */
export function ExclusiveOfferForm({
  fixedClient,
  fixedProduct,
  onDone,
}: {
  fixedClient?: OfferClient;
  fixedProduct?: OfferProduct;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(fixedProduct?.id ?? "");
  const [selected, setSelected] = useState<Map<string, OfferClient>>(
    () => new Map(fixedClient ? [[fixedClient.id, fixedClient]] : []),
  );
  const [search, setSearch] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("DISCOUNT");
  const [discount, setDiscount] = useState("10");
  const [label, setLabel] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notify, setNotify] = useState(true);
  const [tried, setTried] = useState(false);

  const products = useQuery({
    queryKey: ["products", "offer-picker"],
    enabled: !fixedProduct,
    queryFn: () => api<OfferProduct[]>("/api/products?pageSize=100&status=ACTIVE"),
  });
  const clients = useQuery({
    queryKey: ["clients", "offer-picker", search],
    enabled: !fixedClient,
    queryFn: () =>
      api<OfferClient[]>(`/api/clients?status=ACTIVE&pageSize=50&search=${encodeURIComponent(search.trim())}`),
  });

  const productOptions = (products.data?.data ?? []).filter((item) => !item.status || item.status === "ACTIVE");
  const product = fixedProduct ?? productOptions.find((item) => item.id === productId);
  const discountNumber = Number(discount.replace(/[^\d]/g, "")) || 0;

  const preview = product
    ? activeOffer({
        price: Number(product.price),
        offerType,
        offerDiscount: offerType === "DISCOUNT" ? discountNumber : null,
        offerLabel: label.trim() || null,
        offerEndsAt: endsAt ? `${endsAt}T23:59:59-04:00` : null,
      })
    : null;

  const canTake = (client: OfferClient) =>
    product ? productRequestAccess(client.level, product.catalogTier, client.catalogApproved) : { canRequest: true, lockReason: null };

  const errors = {
    product: !product ? "Elige un producto" : undefined,
    clients: selected.size === 0 ? "Elige al menos un cliente" : undefined,
    discount:
      offerType === "DISCOUNT" && (discountNumber < 1 || discountNumber > 90)
        ? "Entre 1% y 90%"
        : offerType === "DISCOUNT" && product?.cost !== undefined && preview && preview.finalPrice <= Number(product.cost)
          ? "Con ese descuento queda por debajo del costo"
          : undefined,
    label: offerType !== "DISCOUNT" && !label.trim() ? (offerType === "GIFT" ? "¿Qué regalo incluye?" : "Escribe la promoción") : undefined,
    endsAt: endsAt && endsAt < todayIso() ? "La fecha ya pasó" : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const blocked = [...selected.values()].filter((client) => !canTake(client).canRequest);

  const save = useMutation({
    mutationFn: () =>
      api<{ created: number; skipped: number; notified: number }>("/api/client-offers", {
        method: "POST",
        body: JSON.stringify({
          clientIds: [...selected.keys()],
          productId: product?.id,
          offerType,
          offerDiscount: offerType === "DISCOUNT" ? discountNumber : null,
          offerLabel: label.trim() || null,
          offerEndsAt: endsAt || null,
          notify,
        }),
      }),
    onSuccess: (res) => {
      const { created, skipped, notified } = res.data;
      const parts = [`Oferta exclusiva para ${created} ${created === 1 ? "cliente" : "clientes"}`];
      if (notified > 0) parts.push(`${notified} avisados por correo`);
      if (skipped > 0) parts.push(`${skipped} no aplican por su categoría`);
      toast.success(parts.join(" · "));
      qc.invalidateQueries({ queryKey: ["client-offers"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleClient(client: OfferClient) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(client.id)) next.delete(client.id);
      else next.set(client.id, client);
      return next;
    });
  }

  const list = clients.data?.data ?? [];

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!hasErrors) save.mutate();
      }}
    >
      {fixedProduct ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500">Producto</p>
          <p className="mt-1 font-semibold">{fixedProduct.name}</p>
          <p className="text-slate-500">
            {money(fixedProduct.price)} · Catálogo {CATALOG_TIER_LABELS[fixedProduct.catalogTier]}
          </p>
        </div>
      ) : (
        <Field label="Producto" required error={tried ? errors.product : undefined}>
          <select className="input" value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">{products.isLoading ? "Cargando..." : "Elige un producto"}</option>
            {productOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {money(item.price)} · {CATALOG_TIER_LABELS[item.catalogTier]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fixedClient ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500">Cliente</p>
          <p className="mt-1 font-semibold">
            {fixedClient.firstName} {fixedClient.lastName} <span className="text-slate-400">· {fixedClient.code}</span>
          </p>
          {product && !canTake(fixedClient).canRequest ? (
            <p className="mt-1 text-xs text-rose-600">{canTake(fixedClient).lockReason}</p>
          ) : null}
        </div>
      ) : (
        <div>
          <span className="label">
            Clientes <span className="ml-0.5 text-rose-500">*</span>
            {selected.size > 0 ? <span className="ml-2 text-navy-700">({selected.size} elegidos)</span> : null}
          </span>
          {selected.size > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[...selected.values()].map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => toggleClient(client)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    canTake(client).canRequest ? "bg-navy-900 text-white" : "bg-rose-100 text-rose-700"
                  }`}
                  title={canTake(client).lockReason ?? undefined}
                >
                  {client.firstName} {client.lastName}
                  <X size={12} />
                </button>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, código, cédula o teléfono"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
            {clients.isLoading ? (
              <p className="p-3 text-sm text-slate-500">Cargando clientes...</p>
            ) : list.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">Sin resultados</p>
            ) : (
              list.map((client) => {
                const access = canTake(client);
                const checked = selected.has(client.id);
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => toggleClient(client)}
                    className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 ${
                      access.canRequest ? "" : "opacity-60"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300"
                      }`}
                    >
                      {checked ? <Check size={13} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {client.firstName} {client.lastName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {client.code}
                        {client.email ? ` · ${client.email}` : " · sin correo"}
                        {!access.canRequest && access.lockReason ? ` · ${access.lockReason}` : ""}
                      </span>
                    </span>
                    <LevelBadge level={client.level} />
                  </button>
                );
              })
            )}
          </div>
          {tried && errors.clients ? <span className="mt-1 block text-xs text-rose-600">{errors.clients}</span> : null}
          {blocked.length > 0 ? (
            <p className="mt-1 text-xs text-amber-700">
              {blocked.length} {blocked.length === 1 ? "cliente no puede" : "clientes no pueden"} pedir este producto por su categoría y no recibirán la oferta.
            </p>
          ) : null}
        </div>
      )}

      <div>
        <span className="label">Tipo de oferta</span>
        <div className="flex flex-wrap gap-2">
          {OFFER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOfferType(type)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                offerType === type ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {OFFER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {offerType === "DISCOUNT" ? (
          <Field label="Descuento %" required error={tried || discount ? errors.discount : undefined}>
            <FormattedInput kind="percent" value={discount} onValue={setDiscount} error={Boolean(errors.discount)} />
          </Field>
        ) : null}
        <Field
          label={offerType === "GIFT" ? "Regalo incluido" : offerType === "PROMO" ? "Texto de la promoción" : "Nota (opcional)"}
          required={offerType !== "DISCOUNT"}
          error={tried ? errors.label : undefined}
        >
          <FormattedInput
            kind="text"
            value={label}
            onValue={setLabel}
            maxLength={120}
            placeholder={offerType === "GIFT" ? "Ej. Juego de vasos" : offerType === "PROMO" ? "Ej. Primera cuota a mitad de precio" : "Ej. Por ser buen cliente"}
          />
        </Field>
        <Field label="Termina el" hint="Vacío = hasta que la use o la quites" error={errors.endsAt}>
          <FormattedInput kind="date" value={endsAt} onValue={setEndsAt} min={todayIso()} error={Boolean(errors.endsAt)} />
        </Field>
      </div>

      {product && preview ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-violet-800">
            <Crown size={15} /> Así lo verá el cliente
          </p>
          <p className="mt-1 text-slate-700">
            {preview.headline}
            {preview.detail ? ` · ${preview.detail}` : ""}
          </p>
          {preview.type === "DISCOUNT" ? (
            <p className="mt-1">
              <span className="text-slate-400 line-through">{money(preview.basePrice)}</span>{" "}
              <strong className="text-violet-800">{money(preview.finalPrice)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
        Avisar por correo a los clientes (los que tengan correo)
      </label>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          <WaitLabel waiting={save.isPending} idle="Crear oferta exclusiva" busy="Creando..." />
        </button>
      </div>
    </form>
  );
}

/** Panel en el detalle del cliente: sus ofertas exclusivas activas. */
export function ClientExclusiveOffers({ client }: { client: OfferClient }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<ClientOfferItem | null>(null);
  const q = useQuery({
    queryKey: ["client-offers", client.id],
    queryFn: () => api<ClientOfferItem[]>(`/api/client-offers?clientId=${client.id}`),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/api/client-offers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Oferta quitada");
      qc.invalidateQueries({ queryKey: ["client-offers"] });
      setRemoving(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const items = useMemo(() => q.data?.data ?? [], [q.data]);

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-semibold">
            <Crown size={16} className="text-violet-600" /> Ofertas exclusivas
          </p>
          <p className="text-sm text-slate-500">Solo este cliente las ve en su portal. Se usan una vez al crear el crédito.</p>
        </div>
        <button type="button" className="btn-ghost text-violet-700" onClick={() => setCreating(true)}>
          <Crown size={15} /> Nueva oferta
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {q.isLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No tiene ofertas exclusivas activas.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              {item.product.imageUrl ? (
                <img src={mediaUrl(item.product.imageUrl)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Crown size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.product.name}</p>
                <p className="truncate text-sm text-slate-600">
                  {item.offer
                    ? `${item.offer.headline}${item.offer.detail ? ` · ${item.offer.detail}` : ""}`
                    : OFFER_TYPE_LABELS[item.offerType]}
                  {item.offer?.type === "DISCOUNT" ? ` · ${money(item.offer.finalPrice)}` : ""}
                </p>
                <p className={`text-xs ${item.expired ? "font-semibold text-rose-600" : "text-slate-400"}`}>
                  {item.expired
                    ? "Vencida"
                    : item.offerEndsAt
                      ? `Hasta ${formatDate(item.offerEndsAt)}`
                      : "Sin fecha de fin"}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-rose-600"
                onClick={() => setRemoving(item)}
                aria-label="Quitar oferta"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {creating ? (
        <Modal
          title="Oferta exclusiva"
          description={`Para ${client.firstName} ${client.lastName}`}
          onClose={() => setCreating(false)}
          size="lg"
        >
          <ExclusiveOfferForm fixedClient={client} onDone={() => setCreating(false)} />
        </Modal>
      ) : null}
      {removing ? (
        <ConfirmModal
          title="Quitar oferta exclusiva"
          message="Vas a quitar la oferta de"
          itemName={removing.product.name}
          confirmText="Quitar"
          loading={cancel.isPending}
          error={cancel.error instanceof Error ? cancel.error.message : undefined}
          consequences={["El cliente deja de verla en su portal", "No se le aplicará al crear un crédito"]}
          onClose={() => setRemoving(null)}
          onConfirm={() => cancel.mutate(removing.id)}
        />
      ) : null}
    </div>
  );
}
