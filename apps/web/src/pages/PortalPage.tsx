import { useState } from "react";
import toast from "react-hot-toast";
import { Bell, CalendarClock, CheckCircle2, Package, Star, UserPlus, Wallet } from "lucide-react";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { creditsFromDebtError, debtFacts, debtNotes, isDebtError } from "../lib/debt";
import { Logo } from "../components/Logo";
import { CatalogBadge, InstallmentBadge, LevelBadge } from "../components/Badges";
import { Field, FormattedInput, Modal } from "../components/Form";
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

type PortalData = {
  client: { code: string; name: string; points: number; level: ClientLevel; affiliationPaid: boolean };
  credits: PortalCredit[];
  paymentClaims?: PortalClaim[];
  payments: Array<{ id: string; amount: number; createdAt: string; type: PaymentType }>;
  catalog: Array<{
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
  }>;
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

  const identity = () => ({ documentId: digitsOnly(documentId), phone: digitsOnly(phone) });

  async function lookup() {
    const res = await api<PortalData>("/api/portal/lookup", {
      method: "POST",
      body: JSON.stringify(identity()),
    });
    setData(res.data);
  }

  const totalBalance = (data?.credits ?? []).reduce((sum, credit) => sum + Number(credit.balance), 0);
  const nextDue = (data?.credits ?? [])
    .flatMap((credit) =>
      credit.installments
        .filter((item) => item.status !== "PAID")
        .map((item) => ({ ...item, product: credit.product.name })),
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const progress = data ? progressToNextLevel(data.client.points) : null;

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <a href="/" className="text-sm text-gold-300">Inicio</a>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-400">Portal del cliente</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Soy cliente</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Consulta tus productos, avisa un pago y pide algo nuevo de tu categoría.
        </p>
        <form
          className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-navy-900/80 p-4 sm:p-5 md:grid-cols-[1fr_1fr_auto]"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const message = firstError([cedulaError(documentId), phoneError(phone)]);
            if (message) {
              setError(message);
              return;
            }
            try {
              await lookup();
            } catch (err) {
              setData(null);
              setError(err instanceof Error ? err.message : "No encontrado");
            }
          }}
        >
          <FormattedInput kind="cedula" required className="input text-navy-900" value={documentId} onValue={setDocumentId} placeholder="000-0000000-0" />
          <FormattedInput kind="phone" required className="input text-navy-900" value={phone} onValue={setPhone} placeholder="809-000-0000" />
          <button className="btn-gold md:min-w-40">Consultar</button>
        </form>
        {error && <p className="mt-4 text-rose-300">{error}</p>}
        {data && (
          <div className="mt-8 space-y-5">
            <section className="overflow-hidden rounded-3xl bg-white text-navy-900 shadow-card">
              <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">{data.client.code}</p>
                  <h2 className="mt-1 font-display text-3xl capitalize sm:text-4xl">{data.client.name.toLowerCase()}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Puedes solicitar {catalogAccessLabel(data.client.level)}. El resto se ve, pero queda bloqueado.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <LevelBadge level={data.client.level} />
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Puntos</p>
                    <p className="font-display text-2xl">{data.client.points}</p>
                    <p className="text-xs text-slate-500">
                      {progress?.next
                        ? `Faltan ${progress.remaining} para ${LEVEL_LABELS[progress.next]}`
                        : "Nivel máximo"}
                    </p>
                  </div>
                  <button
                    className="btn-gold"
                    disabled={busy === "refer"}
                    onClick={() => {
                      setReferError(undefined);
                      setReferOpen(true);
                    }}
                  >
                    <UserPlus size={16} /> Referir cliente
                  </button>
                  <button
                    className="btn-ghost"
                    disabled={busy === "collect"}
                    onClick={async () => {
                      setBusy("collect");
                      try {
                        await api("/api/portal/collect-me", { method: "POST", body: JSON.stringify(identity()) });
                        toast.success("Avisamos al cobrador. También le llega por correo");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "No se pudo avisar");
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <Bell size={16} /> Ven a cobrarme
                  </button>
                </div>
              </div>
              <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
                <SummaryStat icon={Package} label="Productos" value={`${data.credits.length}`} hint="Entregados a crédito" />
                <SummaryStat icon={Wallet} label="Saldo total" value={money(totalBalance)} hint="Lo que falta por pagar" />
                <SummaryStat
                  icon={CalendarClock}
                  label="Próxima cuota"
                  value={nextDue ? money(nextDue.amount) : "Al día"}
                  hint={nextDue ? `${formatDate(nextDue.dueDate)} · ${nextDue.product}` : "No tienes cuotas pendientes"}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="font-display text-2xl text-white">Tus productos</h3>
                <p className="text-sm text-slate-400">Cada entrega con su plan, progreso y cuotas.</p>
              </div>
              {data.credits.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/15 bg-navy-900/50 p-8 text-center">
                  <Package className="mx-auto text-gold-400" />
                  <p className="mt-3 font-display text-xl">Todavía no tienes productos entregados</p>
                  <p className="mt-1 text-sm text-slate-400">Cuando te entreguen un artículo, aquí verás las cuotas y el saldo.</p>
                </div>
              )}
              {data.credits.map((credit) => (
                <CreditCard
                  key={credit.id}
                  credit={credit}
                  pendingClaim={data.paymentClaims?.find((item) => item.creditId === credit.id)}
                  onPay={() => setPayCredit(credit)}
                />
              ))}
            </section>

            <section className="rounded-3xl bg-white p-5 text-navy-900 sm:p-6">
              <h3 className="font-display text-2xl">Catálogo</h3>
              <p className="mt-1 text-sm text-slate-500">Ves todo. Solo puedes pedir lo de tu categoría.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.catalog.map((product) => (
                  <div
                    key={product.id}
                    className={`flex flex-col overflow-hidden rounded-2xl border ${product.canRequest ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className="relative h-40 bg-slate-100">
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
                    <p className="font-display text-xl">{product.name}</p>
                    {product.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p> : null}
                    <p className="mt-1 text-lg font-semibold">{money(product.price)}</p>
                    <div className="mt-auto pt-4">
                      {product.canRequest ? (
                        <button
                          className="btn-primary w-full"
                          disabled={product.requested || busy === product.id}
                          onClick={async () => {
                            setBusy(product.id);
                            try {
                              await api("/api/portal/request", {
                                method: "POST",
                                body: JSON.stringify({ ...identity(), productId: product.id }),
                              });
                              toast.success("Solicitud enviada. El equipo recibe aviso en la app y por correo");
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
                        >
                          {product.requested ? "Ya solicitado" : "Solicitar"}
                        </button>
                      ) : product.lockReason?.includes("saldar") ? (
                        <button
                          type="button"
                          className="btn-ghost w-full"
                          onClick={() => setDebtModal(data.debt?.[0] ?? null)}
                        >
                          Ver deuda pendiente
                        </button>
                      ) : (
                        <p className="text-xs font-medium text-rose-700">{product.lockReason}</p>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 text-navy-900 sm:p-6">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-gold-600" />
                  <h3 className="font-display text-2xl">Tus puntos</h3>
                </div>
                <ul className="mt-4 divide-y">
                  {(data.pointsLedger ?? []).length === 0 && <li className="py-6 text-sm text-slate-500">Todavía no has ganado puntos.</li>}
                  {(data.pointsLedger ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <span>{POINTS_ACTION_LABELS[item.action] || item.note || item.action}</span>
                      <b className={item.points > 0 ? "text-emerald-700" : "text-rose-700"}>
                        {item.points > 0 ? `+${item.points}` : item.points}
                      </b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-white p-5 text-navy-900 sm:p-6">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-gold-600" />
                  <h3 className="font-display text-2xl">Últimos pagos</h3>
                </div>
                <ul className="mt-4 divide-y">
                  {data.payments.length === 0 && <li className="py-6 text-sm text-slate-500">Aún no hay cobros registrados.</li>}
                  {data.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}</p>
                        <p className="text-xs text-slate-500">{formatDate(payment.createdAt)}</p>
                      </div>
                      <b>{money(payment.amount)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            <section className="rounded-3xl bg-white p-5 text-navy-900 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <UserPlus size={18} className="text-gold-600" />
                    <h3 className="font-display text-2xl">Tus referidos</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Nombre y teléfono de quien quieres traer. Cuando el equipo lo entre y coincida, ganas {POINTS_RULES.REFERRAL} puntos.
                  </p>
                </div>
                <button
                  className="btn-gold"
                  type="button"
                  onClick={() => {
                    setReferError(undefined);
                    setReferOpen(true);
                  }}
                >
                  Referir cliente
                </button>
              </div>
              <ul className="mt-4 divide-y">
                {(data.referrals ?? []).length === 0 && (
                  <li className="py-6 text-sm text-slate-500">Todavía no has referido a nadie.</li>
                )}
                {(data.referrals ?? []).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{item.firstName} {item.lastName}</p>
                      <p className="text-xs text-slate-500">{formatPhoneRD(item.phone)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-navy-800">
                      {REFERRAL_STATUS_LABELS[item.status]}
                      {item.pointsAwarded ? ` · +${POINTS_RULES.REFERRAL}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
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
                      toast.success("Referido enviado. El equipo recibe aviso para entrar a esa persona");
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
              <Modal title="Avisar un pago" onClose={() => setPayCredit(null)}>
                <PayClaimForm
                  credit={payCredit}
                  identity={identity()}
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
        )}
      </main>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="font-display text-xl">{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
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
      return isNext ? "border-gold-400 bg-gold-50 ring-2 ring-gold-200" : "border-slate-100 bg-slate-50";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function CreditCard({
  credit,
  pendingClaim,
  onPay,
}: {
  credit: PortalCredit;
  pendingClaim?: PortalClaim;
  onPay: () => void;
}) {
  const pending = credit.installments.filter((item) => item.status !== "PAID");
  const paidCount = credit.installments.length - pending.length;
  const percent = credit.installments.length === 0 ? 0 : Math.round((paidCount / credit.installments.length) * 100);
  const next = pending[0];
  const frequency = credit.frequency ?? "WEEKLY";

  return (
    <article className="overflow-hidden rounded-3xl bg-white text-navy-900 shadow-card">
      {credit.product.imageUrl ? (
        <img src={mediaUrl(credit.product.imageUrl)} alt={credit.product.name} className="h-44 w-full object-cover" />
      ) : null}
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{credit.code}</p>
            <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-300">
              {PAYMENT_FREQUENCY_LABELS[frequency]}
            </span>
          </div>
          <h4 className="mt-1 font-display text-3xl">{credit.product.name}</h4>
          <p className="mt-2 text-sm text-slate-600">
            {pending.length === 0
              ? "Este producto ya está saldado"
              : `Te faltan ${pending.length} de ${credit.installments.length} cuotas`}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {paidCount} pagadas · {percent}% del plan
            {credit.weeks ? ` · ${credit.weeks} ${PAYMENT_FREQUENCY_LABELS[frequency].toLowerCase()}` : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-navy-950 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-gold-300">Saldo</p>
          <p className="mt-1 font-display text-3xl">{money(credit.balance)}</p>
          {next ? (
            <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
              <p className="text-gold-300">Próxima cuota</p>
              <p className="mt-1 font-semibold">{money(next.amount)}</p>
              <p className="text-xs text-slate-300">{formatDate(next.dueDate)}</p>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 size={16} /> Completado
            </div>
          )}
        </div>
      </div>
      {Number(credit.balance) > 0 ? (
        <div className="px-5 pb-4 sm:px-6">
          {pendingClaim ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Aviso de {PAYMENT_METHOD_LABELS[pendingClaim.method]} por {money(pendingClaim.amount)} en revisión. Dirección lo valida.
            </p>
          ) : (
            <button type="button" className="btn-gold w-full sm:w-auto" onClick={onPay}>
              <Wallet size={16} /> Pagar / avisar cobro
            </button>
          )}
        </div>
      ) : null}
      <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Plan de cuotas</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {credit.installments.map((item) => {
            const status = effectiveInstallmentStatus(item.status, item.dueDate);
            const isNext = next?.id === item.id;
            const tone = installmentTone(status, isNext);
            return (
              <div key={item.id} className={`rounded-2xl border p-3 ${tone}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                    {item.number}
                  </span>
                  <InstallmentBadge status={item.status} dueDate={item.dueDate} />
                </div>
                <p className="mt-3 text-sm font-semibold">{money(item.amount)}</p>
                <p className="text-xs text-slate-500">{formatDate(item.dueDate)}</p>
                {isNext ? <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gold-700">Siguiente</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function PayClaimForm({
  credit,
  identity,
  onCancel,
  onDone,
}: {
  credit: PortalCredit;
  identity: { documentId: string; phone: string };
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const next = credit.installments.find((item) => item.status !== "PAID");
  const suggested = next ? Number(next.amount) - Number(next.paidAmount ?? 0) : Number(credit.weeklyQuota ?? 0);
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : "");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
        if (method === "TRANSFER" && !receipt) {
          setError("Sube la foto del comprobante de la transferencia");
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
          toast.success(method === "CASH" ? "Avisamos que pagaste en efectivo. Dirección lo valida." : "Comprobante enviado. Dirección valida el pago.");
          await onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo enviar el aviso");
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-sm text-slate-600">
        {credit.product.name}. Si pagaste en efectivo y el cobrador todavía no lo cargó, avísanos aquí.
      </p>
      <Field label="Cómo pagaste" required>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "TRANSFER")}>
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Transferencia</option>
        </select>
      </Field>
      <Field label="Monto" required>
        <FormattedInput kind="money" required value={amount} onValue={setAmount} />
      </Field>
      {method === "TRANSFER" ? (
        <Field label="Foto del comprobante" required>
          <input
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
            onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
          />
          {receipt ? (
            <img src={URL.createObjectURL(receipt)} alt="Comprobante" className="mt-2 h-36 w-full rounded-xl object-cover" />
          ) : (
            <p className="mt-1 text-xs text-slate-400">JPG o PNG del voucher o captura.</p>
          )}
        </Field>
      ) : (
        <Field label="Foto (opcional)">
          <input
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
            onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
          />
        </Field>
      )}
      <Field label="Nota">
        <FormattedInput kind="text" value={notes} onValue={setNotes} placeholder="Quién cobró, banco, hora..." />
      </Field>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>{saving ? "Enviando..." : "Enviar aviso"}</button>
      </div>
    </form>
  );
}
