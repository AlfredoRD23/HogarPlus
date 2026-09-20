import { useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Download, Package, UserPlus, Wallet } from "lucide-react";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { creditsFromDebtError, debtFacts, debtNotes, isDebtError } from "../lib/debt";
import { openInvoice, type InvoiceData } from "../lib/invoice";
import { Logo } from "../components/Logo";
import { WaitLabel } from "../components/Loader";
import { CatalogBadge, InstallmentBadge, LevelBadge } from "../components/Badges";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { InfoModal } from "../components/InfoModal";
import { ReferClientForm } from "../components/ReferClientForm";
import {
  CATEGORY_LABELS,
  catalogAccessLabel,
  cedulaError,
  digitsOnly,
  effectiveInstallmentStatus,
  firstError,
  formatPhoneRD,
  LEVEL_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  moneyError,
  parseMoney,
  phoneError,
  POINTS_ACTION_LABELS,
  POINTS_RULES,
  progressToNextLevel,
  REFERRAL_STATUS_LABELS,
  type CatalogTier,
  type ClientLevel,
  type CreditStatus,
  type InstallmentStatus,
  type OutstandingCredit,
  type PaymentFrequency,
  type PaymentType,
  type PointsAction,
  type ProductCategory,
  type ReferralStatus,
} from "@hogarplus/shared";

type PortalInstallment = {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: InstallmentStatus;
};

type PortalCredit = {
  id: string;
  code: string;
  status: CreditStatus;
  balance: number;
  price?: number;
  downPayment?: number;
  weeks?: number;
  weeklyQuota?: number;
  frequency?: PaymentFrequency;
  product: { name: string; imageUrl?: string | null };
  installments: PortalInstallment[];
};

type PortalClaim = {
  id: string;
  creditId: string;
  amount: number;
  method: "CASH" | "TRANSFER" | "DEPOSIT";
  createdAt: string;
};

type PortalPayment = {
  id: string;
  code?: string;
  amount: number;
  createdAt: string;
  type: PaymentType;
  credit?: { code: string; product: { name: string } } | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  catalogTier: CatalogTier;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  canRequest: boolean;
  lockReason: string | null;
  requested: boolean;
};

type PortalData = {
  client: { code: string; name: string; points: number; level: ClientLevel; affiliationPaid: boolean };
  credits: PortalCredit[];
  paymentClaims?: PortalClaim[];
  payments: PortalPayment[];
  catalog: CatalogProduct[];
  pointsLedger: Array<{ id: string; action: PointsAction; points: number; note?: string }>;
  debt?: OutstandingCredit[];
  referrals?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: ReferralStatus;
    pointsAwarded: boolean;
    createdAt: string;
  }>;
};

type ActivityTab = "payments" | "points" | "referrals";

export function PortalPage() {
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [referOpen, setReferOpen] = useState(false);
  const [referError, setReferError] = useState<string | undefined>();
  const [debtModal, setDebtModal] = useState<OutstandingCredit | null>(null);
  const [payCredit, setPayCredit] = useState<PortalCredit | null>(null);
  const [activeCreditId, setActiveCreditId] = useState("");
  const [activity, setActivity] = useState<ActivityTab>("payments");

  const identity = () => ({ documentId: digitsOnly(documentId), phone: digitsOnly(phone) });

  async function lookup() {
    const res = await api<PortalData>("/api/portal/lookup", {
      method: "POST",
      body: JSON.stringify(identity()),
    });
    setData(res.data);
    setActiveCreditId((current) => current || res.data.credits[0]?.id || "");
  }

  async function consult() {
    setError("");
    const message = firstError([cedulaError(documentId), phoneError(phone)]);
    if (message) {
      setError(message);
      return;
    }
    setBusy("lookup");
    try {
      await lookup();
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "No encontrado");
    } finally {
      setBusy("");
    }
  }

  async function downloadInvoice(paymentId: string) {
    try {
      const res = await api<InvoiceData>("/api/portal/invoice", {
        method: "POST",
        body: JSON.stringify({ ...identity(), paymentId }),
      });
      openInvoice(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir la factura");
    }
  }

  if (!data) {
    return (
      <PortalGate
        documentId={documentId}
        phone={phone}
        error={error}
        busy={busy === "lookup"}
        onDocumentId={setDocumentId}
        onPhone={setPhone}
        onSubmit={() => void consult()}
      />
    );
  }

  const payableCredits = data.credits.filter((credit) => Number(credit.balance) > 0);
  const totalBalance = data.credits.reduce((sum, credit) => sum + Number(credit.balance), 0);
  const nextDue = data.credits
    .flatMap((credit) =>
      credit.installments
        .filter((item) => item.status !== "PAID")
        .map((item) => ({ ...item, product: credit.product.name })),
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const progress = progressToNextLevel(data.client.points);
  const selected = data.credits.find((credit) => credit.id === activeCreditId) ?? data.credits[0] ?? null;
  const selectedNext = selected?.installments.find((item) => item.status !== "PAID");

  return (
    <div className="min-h-screen bg-[#F3EFE6] text-navy-900">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo compact />
          <div className="flex items-center gap-3 text-sm">
            <a className="hidden text-gold-100 sm:inline" href="/">Inicio</a>
            <button
              type="button"
              className="rounded-xl border border-white/15 px-3 py-2 text-gold-100 hover:bg-navy-800"
              onClick={() => {
                setData(null);
                setError("");
                setActiveCreditId("");
              }}
            >
              Salir
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gold-300">Hola</p>
              <h1 className="font-display text-3xl capitalize tracking-tight">{data.client.name.toLowerCase()}</h1>
              <p className="mt-1 text-sm text-slate-300">
                {data.client.code} · {catalogAccessLabel(data.client.level)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LevelBadge level={data.client.level} />
                <span className="rounded-full bg-navy-800 px-3 py-1 text-xs text-gold-100">
                  {data.client.points} pts
                  {progress.next ? ` · ${progress.remaining} para ${LEVEL_LABELS[progress.next]}` : ""}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-gold"
                disabled={payableCredits.length === 0}
                onClick={() => setPayCredit(selected && Number(selected.balance) > 0 ? selected : payableCredits[0] ?? null)}
              >
                <Wallet size={16} /> Enviar pago
              </button>
              <button
                type="button"
                className="btn-ghost border-white/15 bg-transparent text-white hover:bg-navy-800"
                disabled={busy === "collect"}
                onClick={async () => {
                  setBusy("collect");
                  try {
                    await api("/api/portal/collect-me", { method: "POST", body: JSON.stringify(identity()) });
                    toast.success("Avisamos al cobrador");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "No se pudo avisar");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                <Bell size={16} /> Ven a cobrarme
              </button>
              <button
                type="button"
                className="btn-ghost border-white/15 bg-transparent text-white hover:bg-navy-800"
                onClick={() => {
                  setReferError(undefined);
                  setReferOpen(true);
                }}
              >
                <UserPlus size={16} /> Referir
              </button>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-300">
            Saldo {money(totalBalance)}
            {nextDue ? ` · Próxima ${money(nextDue.amount)} · ${formatDate(nextDue.dueDate)}` : " · Al día"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <SectionHead
            title="Tus productos"
            hint={selected ? `${selected.product.name} · ${selected.code}` : "Aún no hay entregas"}
          />
          {data.credits.length === 0 ? (
            <EmptyStrip text="Cuando te entreguen un artículo, sale aquí." />
          ) : (
            <>
              <Carousel>
                {data.credits.map((credit) => (
                  <CreditSlide
                    key={credit.id}
                    credit={credit}
                    active={credit.id === selected?.id}
                    pendingClaim={data.paymentClaims?.find((item) => item.creditId === credit.id)}
                    onSelect={() => setActiveCreditId(credit.id)}
                    onPay={() => setPayCredit(credit)}
                  />
                ))}
              </Carousel>
              {selected ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-slate-500">
                    {selectedNext
                      ? `Cuotas de ${selected.product.name}`
                      : `${selected.product.name} ya está saldado`}
                  </p>
                  <Carousel>
                    {selected.installments.map((item) => {
                      const status = effectiveInstallmentStatus(item.status, item.dueDate);
                      const isNext = selectedNext?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`carousel-item w-36 rounded-2xl border p-3 ${installmentTone(status, isNext)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">{item.number}</span>
                            <InstallmentBadge status={item.status} dueDate={item.dueDate} />
                          </div>
                          <p className="mt-3 text-sm font-semibold">{money(item.amount)}</p>
                          <p className="text-xs text-slate-500">{formatDate(item.dueDate)}</p>
                        </div>
                      );
                    })}
                  </Carousel>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section>
          <SectionHead title="Catálogo" hint="Desliza. Solo pides lo de tu categoría." />
          {data.catalog.length === 0 ? (
            <EmptyStrip text="No hay productos en catálogo." />
          ) : (
            <Carousel>
              {data.catalog.map((product) => (
                <CatalogSlide
                  key={product.id}
                  product={product}
                  busy={busy === product.id}
                  onRequest={async () => {
                    setBusy(product.id);
                    try {
                      await api("/api/portal/request", {
                        method: "POST",
                        body: JSON.stringify({ ...identity(), productId: product.id }),
                      });
                      toast.success("Solicitud enviada");
                      await lookup();
                    } catch (err) {
                      if (isDebtError(err)) {
                        setDebtModal(creditsFromDebtError(err)[0] ?? data.debt?.[0] ?? null);
                      } else {
                        toast.error(err instanceof Error ? err.message : "No se pudo solicitar");
                      }
                    } finally {
                      setBusy("");
                    }
                  }}
                  onDebt={() => setDebtModal(data.debt?.[0] ?? null)}
                />
              ))}
            </Carousel>
          )}
        </section>

        <section className="panel p-4 sm:p-5">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([
              ["payments", "Pagos"],
              ["points", "Puntos"],
              ["referrals", "Referidos"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`h-10 flex-1 rounded-lg text-sm font-medium ${
                  activity === id ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                }`}
                onClick={() => setActivity(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {activityPanel(activity, data, () => {
              setReferError(undefined);
              setReferOpen(true);
            }, downloadInvoice)}
          </div>
        </section>
      </main>

      {referOpen && (
        <Modal title="Referir un cliente" onClose={() => setReferOpen(false)}>
          <ReferClientForm
            error={referError}
            loading={busy === "refer"}
            onCancel={() => setReferOpen(false)}
            onSave={async (body) => {
              setBusy("refer");
              setReferError(undefined);
              try {
                await api("/api/portal/refer", {
                  method: "POST",
                  body: JSON.stringify({ ...identity(), firstName: body.firstName, lastName: body.lastName, referredPhone: body.phone }),
                });
                toast.success("Referido enviado");
                setReferOpen(false);
                await lookup();
              } catch (err) {
                setReferError(err instanceof Error ? err.message : "No se pudo enviar");
              } finally {
                setBusy("");
              }
            }}
          />
        </Modal>
      )}
      {payCredit && (
        <Modal title="Enviar pago o comprobante" onClose={() => setPayCredit(null)}>
          <PayClaimForm
            credits={payableCredits}
            credit={payCredit}
            identity={identity()}
            onCreditChange={setPayCredit}
            onCancel={() => setPayCredit(null)}
            onDone={async () => {
              setPayCredit(null);
              await lookup();
            }}
          />
        </Modal>
      )}
      {debtModal && (
        <InfoModal
          title="Hay que saldar el producto anterior"
          message="No puedes pedir otro artículo mientras quede saldo en"
          itemName={debtModal.productName}
          facts={debtFacts(debtModal)}
          notes={debtNotes(debtModal)}
          actionLabel="Avisar al cobrador"
          onAction={async () => {
            setBusy("collect");
            try {
              await api("/api/portal/collect-me", { method: "POST", body: JSON.stringify(identity()) });
              toast.success("Avisamos al cobrador");
              setDebtModal(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo avisar");
            } finally {
              setBusy("");
            }
          }}
          onClose={() => setDebtModal(null)}
        />
      )}
    </div>
  );
}

function activityPanel(
  tab: ActivityTab,
  data: PortalData,
  onRefer: () => void,
  onInvoice: (id: string) => void,
) {
  switch (tab) {
    case "payments":
      return (
        <ul className="divide-y divide-slate-100">
          {data.payments.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Aún no hay cobros.</li>}
          {data.payments.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(payment.createdAt)}
                  {payment.credit?.product.name ? ` · ${payment.credit.product.name}` : ""}
                </p>
              </div>
              <div className="text-right">
                <b>{money(payment.amount)}</b>
                <button
                  type="button"
                  className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold text-navy-800"
                  onClick={() => onInvoice(payment.id)}
                >
                  <Download size={12} /> Factura
                </button>
              </div>
            </li>
          ))}
        </ul>
      );
    case "points":
      return (
        <ul className="divide-y divide-slate-100">
          {(data.pointsLedger ?? []).length === 0 && <li className="py-8 text-center text-sm text-slate-500">Todavía no has ganado puntos.</li>}
          {(data.pointsLedger ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3 text-sm">
              <span>{POINTS_ACTION_LABELS[item.action] || item.note || item.action}</span>
              <b className={item.points > 0 ? "text-emerald-700" : "text-rose-700"}>
                {item.points > 0 ? `+${item.points}` : item.points}
              </b>
            </li>
          ))}
        </ul>
      );
    case "referrals":
      return (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Si entra esa persona, ganas {POINTS_RULES.REFERRAL} puntos.</p>
            <button className="btn-gold btn-compact" type="button" onClick={onRefer}>
              Referir
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {(data.referrals ?? []).length === 0 && <li className="py-8 text-center text-sm text-slate-500">Todavía no has referido a nadie.</li>}
            {(data.referrals ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{item.firstName} {item.lastName}</p>
                  <p className="text-xs text-slate-500">{formatPhoneRD(item.phone)}</p>
                </div>
                <span className="text-xs font-semibold text-navy-700">
                  {REFERRAL_STATUS_LABELS[item.status]}
                  {item.pointsAwarded ? ` · +${POINTS_RULES.REFERRAL}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function EmptyStrip({ text }: { text: string }) {
  return (
    <div className="panel px-5 py-8 text-center text-sm text-slate-500">{text}</div>
  );
}

function Carousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.8, 340), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Anterior"
        className="absolute -left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 shadow-sm sm:flex"
        onClick={() => move(-1)}
      >
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} className="carousel px-1">
        {children}
      </div>
      <button
        type="button"
        aria-label="Siguiente"
        className="absolute -right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 shadow-sm sm:flex"
        onClick={() => move(1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function CreditSlide({
  credit,
  active,
  pendingClaim,
  onSelect,
  onPay,
}: {
  credit: PortalCredit;
  active: boolean;
  pendingClaim?: PortalClaim;
  onSelect: () => void;
  onPay: () => void;
}) {
  const pending = credit.installments.filter((item) => item.status !== "PAID");
  const next = pending[0];
  const frequency = credit.frequency ?? "WEEKLY";

  return (
    <article
      className={`carousel-item w-[min(78vw,280px)] overflow-hidden rounded-2xl border bg-white ${
        active ? "border-gold-500 shadow-card" : "border-slate-200"
      }`}
    >
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <div className="h-36 bg-slate-100">
          {credit.product.imageUrl ? (
            <img src={mediaUrl(credit.product.imageUrl)} alt={credit.product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Package size={28} />
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400">{credit.code} · {PAYMENT_FREQUENCY_LABELS[frequency]}</p>
          <h3 className="mt-1 font-display text-lg leading-tight">{credit.product.name}</h3>
          <p className="mt-2 font-display text-2xl">{money(credit.balance)}</p>
          {next ? (
            <p className="mt-1 text-xs text-slate-500">Próxima {money(next.amount)} · {formatDate(next.dueDate)}</p>
          ) : (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={12} /> Saldado
            </p>
          )}
        </div>
      </button>
      {Number(credit.balance) > 0 ? (
        <div className="px-4 pb-4">
          {pendingClaim ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {PAYMENT_METHOD_LABELS[pendingClaim.method]} {money(pendingClaim.amount)} en revisión
            </p>
          ) : (
            <button type="button" className="btn-gold w-full btn-compact" onClick={onPay}>
              Subir comprobante
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function CatalogSlide({
  product,
  busy,
  onRequest,
  onDebt,
}: {
  product: CatalogProduct;
  busy: boolean;
  onRequest: () => void;
  onDebt: () => void;
}) {
  return (
    <article className="carousel-item flex w-[min(78vw,260px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative h-36 bg-slate-100">
        {product.imageUrl ? (
          <img src={mediaUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Package size={28} />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <CatalogBadge tier={product.catalogTier} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-slate-500">{CATEGORY_LABELS[product.category]}</p>
        <p className="mt-0.5 font-semibold leading-tight">{product.name}</p>
        <p className="mt-2 font-display text-lg">{money(product.price)}</p>
        <div className="mt-auto pt-3">
          {product.canRequest ? (
            <button className="btn-gold w-full btn-compact" disabled={product.requested || busy} onClick={onRequest}>
              {product.requested ? "Ya solicitado" : "Solicitar"}
            </button>
          ) : product.lockReason?.includes("saldar") ? (
            <button type="button" className="btn-ghost w-full btn-compact" onClick={onDebt}>
              Ver deuda
            </button>
          ) : (
            <p className="text-xs font-medium text-rose-700">{product.lockReason}</p>
          )}
        </div>
      </div>
    </article>
  );
}

function PortalGate({
  documentId,
  phone,
  error,
  busy,
  onDocumentId,
  onPhone,
  onSubmit,
}: {
  documentId: string;
  phone: string;
  error: string;
  busy: boolean;
  onDocumentId: (value: string) => void;
  onPhone: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <p className="text-gold-300">Tu cuenta · Tus cuotas · Tus facturas</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight">
            Consulta tu saldo, sube el comprobante y descarga tu factura.
          </h2>
        </div>
        <p className="text-sm text-slate-300">Entra con tu cédula y el teléfono registrado.</p>
      </section>
      <section className="flex items-center justify-center bg-[#F3EFE6] p-6">
        <form
          className="panel w-full max-w-md p-8"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="lg:hidden">
            <Logo light />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold text-navy-900">Soy cliente</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa con tu cédula y teléfono para ver cuotas, enviar un pago y descargar facturas.
          </p>
          <div className="mt-6">
            <Field label="Cédula" hint={fieldHint("cedula")} required>
              <FormattedInput kind="cedula" required value={documentId} onValue={onDocumentId} placeholder="000-0000000-0" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Teléfono" hint={fieldHint("phone")} required>
              <FormattedInput kind="phone" required value={phone} onValue={onPhone} placeholder="809-000-0000" />
            </Field>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}
          <button className="btn-gold mt-6 w-full" disabled={busy}>
            <WaitLabel waiting={busy} idle="Entrar a mi cuenta" busy="Buscando..." />
          </button>
          <p className="mt-4 text-center text-xs text-slate-500">
            <a className="text-navy-700 underline" href="/">Inicio</a>
            {" · "}
            <a className="text-navy-700 underline" href="/login">Soy del equipo</a>
          </p>
        </form>
      </section>
    </div>
  );
}

function installmentTone(status: InstallmentStatus, isNext: boolean): string {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50";
    case "OVERDUE":
      return "border-rose-200 bg-rose-50";
    case "PARTIAL":
      return "border-amber-200 bg-amber-50";
    case "PREPAID":
      return "border-sky-200 bg-sky-50";
    case "PENDING":
      return isNext ? "border-gold-500 bg-gold-50" : "border-slate-200 bg-white";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function PayClaimForm({
  credits,
  credit,
  identity,
  onCreditChange,
  onCancel,
  onDone,
}: {
  credits: PortalCredit[];
  credit: PortalCredit;
  identity: { documentId: string; phone: string };
  onCreditChange: (credit: PortalCredit) => void;
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const next = credit.installments.find((item) => item.status !== "PAID");
  const suggested = next ? Number(next.amount) - Number(next.paidAmount ?? 0) : Number(credit.weeklyQuota ?? 0);
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "DEPOSIT">("TRANSFER");
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : "");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const needsPhoto = method === "TRANSFER" || method === "DEPOSIT";

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const amountMessage = moneyError(amount, { label: "monto" }) ?? "";
        if (amountMessage) {
          setError(amountMessage);
          return;
        }
        if (needsPhoto && !receipt) {
          setError("Sube la foto del comprobante");
          return;
        }
        setSaving(true);
        setError("");
        try {
          const body = new FormData();
          body.append("documentId", identity.documentId);
          body.append("phone", identity.phone);
          body.append("creditId", credit.id);
          body.append("amount", String(parseMoney(amount)));
          body.append("method", method);
          if (notes.trim()) body.append("notes", notes.trim());
          if (receipt) body.append("receipt", receipt);
          await api("/api/portal/pay", { method: "POST", body });
          toast.success("El aviso quedó en solicitudes de pago para que Dirección lo reciba.");
          await onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo enviar el aviso");
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-sm text-slate-600">
        Si ya pagaste, súbelo aquí. Dirección lo ve en solicitudes de pago y, al validarlo, se genera la factura.
      </p>
      {credits.length > 1 ? (
        <Field label="Producto" required>
          <select
            className="input"
            value={credit.id}
            onChange={(event) => {
              const nextCredit = credits.find((item) => item.id === event.target.value);
              if (nextCredit) onCreditChange(nextCredit);
            }}
          >
            {credits.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product.name} · {item.code}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="text-sm font-medium text-navy-900">{credit.product.name}</p>
      )}
      <Field label="Cómo pagaste" required>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "TRANSFER" | "DEPOSIT")}>
          <option value="TRANSFER">Transferencia</option>
          <option value="DEPOSIT">Depósito</option>
          <option value="CASH">Efectivo</option>
        </select>
      </Field>
      <Field label="Monto" required>
        <FormattedInput kind="money" required value={amount} onValue={setAmount} />
      </Field>
      <Field label={needsPhoto ? "Foto del comprobante" : "Foto (opcional)"} required={needsPhoto}>
        <input
          className="input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
        />
        {receipt ? (
          <img src={URL.createObjectURL(receipt)} alt="Comprobante" className="mt-2 h-36 w-full rounded-xl object-cover" />
        ) : (
          <p className="mt-1 text-xs text-slate-400">JPG o PNG del voucher, captura o recibo.</p>
        )}
      </Field>
      <Field label="Nota">
        <FormattedInput kind="text" value={notes} onValue={setNotes} placeholder="Banco, hora o quién cobró" />
      </Field>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>
          <WaitLabel waiting={saving} idle="Enviar a solicitudes" busy="Enviando..." />
        </button>
      </div>
    </form>
  );
}
