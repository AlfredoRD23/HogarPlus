import { useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Download, Home, LogOut, Package, UserPlus, Wallet } from "lucide-react";
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
  CATALOG_TIER_LABELS,
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
  requiredLevelForTier,
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
  client: {
    code: string;
    name: string;
    points: number;
    level: ClientLevel;
    affiliationPaid: boolean;
    photoUrl?: string | null;
  };
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
  const [levelLock, setLevelLock] = useState<CatalogProduct | null>(null);
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

  return (
    <div className="portal-shell min-h-screen text-white">
      <header className="portal-nav text-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Home size={16} /> Inicio
            </a>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold-500 px-3.5 text-sm font-semibold text-navy-950 hover:bg-gold-600"
              onClick={() => {
                setData(null);
                setError("");
                setActiveCreditId("");
              }}
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 sm:px-8">
        <div className="portal-hero overflow-hidden rounded-3xl px-5 py-6 text-white sm:px-7">
          <div className="flex items-start gap-4">
            <ProfilePhoto name={data.client.name} photoUrl={data.client.photoUrl} />
            <div className="min-w-0">
              <p className="text-sm text-gold-300">Mi cuenta · {LEVEL_LABELS[data.client.level]}</p>
              <h1 className="font-display text-4xl font-semibold capitalize tracking-tight text-white">{data.client.name.toLowerCase()}</h1>
              <p className="mt-1 text-sm text-slate-300">
                {data.client.code} · puedes pedir {catalogAccessLabel(data.client.level)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LevelBadge level={data.client.level} />
                <span className="rounded-full bg-navy-800 px-3 py-1 text-xs text-gold-100">
                  {data.client.points} pts
                  {progress.next ? ` · ${progress.remaining} para ${LEVEL_LABELS[progress.next]}` : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeaderStat label="Saldo" value={money(totalBalance)} hint="Lo que falta por pagar" />
            <HeaderStat
              label="Próxima cuota"
              value={nextDue ? money(nextDue.amount) : "Al día"}
              hint={nextDue ? formatDate(nextDue.dueDate) : "No tienes cuotas pendientes"}
            />
            <HeaderStat
              label="Puntos"
              value={String(data.client.points)}
              hint={progress.next ? `Faltan ${progress.remaining} para ${LEVEL_LABELS[progress.next]}` : "Nivel máximo"}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
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
                if (busy) return;
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
      </div>

      <main className="space-y-8 px-4 py-8 sm:px-8">
        <section>
          {data.credits.length === 0 ? (
            <>
              <SectionHead light title="Tus productos" hint="Aún no hay entregas" />
              <EmptyStrip text="Cuando te entreguen un artículo, sale aquí." />
            </>
          ) : (
            <>
              <Carousel
                light
                title="Tus productos"
                hint={
                  data.credits.length > 1
                    ? `${data.credits.length} productos · toca uno para ver sus cuotas`
                    : "Toca uno para ver su plan de cuotas"
                }
              >
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
                <InstallmentPlan
                  credit={selected}
                  credits={data.credits}
                  onSelect={setActiveCreditId}
                />
              ) : null}
            </>
          )}
        </section>

        <section className="panel p-4 sm:p-5">
          {data.catalog.length === 0 ? (
            <>
              <SectionHead title="Catálogo" hint="Cuando haya productos, salen aquí." />
              <p className="text-sm text-slate-500">No hay productos en catálogo.</p>
            </>
          ) : (
            <Carousel title="Catálogo" hint="Pide los de tu categoría. Si tocas otro, te explicamos.">
              {data.catalog.map((product) => (
                <CatalogSlide
                  key={product.id}
                  product={product}
                  busy={busy === product.id}
                  onAsk={async () => {
                    if (!product.canRequest && !product.lockReason?.includes("saldar")) {
                      setLevelLock(product);
                      return;
                    }
                    if (!product.canRequest && product.lockReason?.includes("saldar")) {
                      setDebtModal(data.debt?.[0] ?? null);
                      return;
                    }
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
      {levelLock && (
        <InfoModal
          title={`Este es de ${CATALOG_TIER_LABELS[levelLock.catalogTier]}`}
          message="Tu categoría ahora es"
          itemName={LEVEL_LABELS[data.client.level]}
          notes={[
            `Para pedirlo tienes que subir a ${LEVEL_LABELS[requiredLevelForTier(levelLock.catalogTier)]}.`,
            `Tú puedes pedir: ${catalogAccessLabel(data.client.level)}.`,
          ]}
          onClose={() => setLevelLock(null)}
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

function ProfilePhoto({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "C";
  return photoUrl ? (
    <img src={mediaUrl(photoUrl)} alt={name} className="h-24 w-24 rounded-full object-cover ring-2 ring-gold-400" />
  ) : (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-navy-800 text-3xl font-semibold text-gold-300 ring-2 ring-gold-400">
      {initial}
    </div>
  );
}

function HeaderStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="portal-stat rounded-2xl px-4 py-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 font-display text-xl text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function SectionHead({ title, hint, light }: { title: string; hint: string; light?: boolean }) {
  return (
    <div className="mb-3">
      <h2 className={`font-display text-3xl font-semibold tracking-tight ${light ? "text-white" : "text-navy-900"}`}>{title}</h2>
      <div className="mt-1.5 h-1 w-11 rounded-full bg-gold-500" />
      <p className={`mt-2 text-sm font-medium ${light ? "text-slate-300" : "text-navy-800/70"}`}>{hint}</p>
    </div>
  );
}

function EmptyStrip({ text }: { text: string }) {
  return (
    <div className="panel px-5 py-8 text-sm text-slate-500">{text}</div>
  );
}

function Carousel({ title, hint, children, light }: { title: string; hint: string; children: ReactNode; light?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.75, 300), behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <SectionHead title={title} hint={hint} light={light} />
        <div className="mb-3 hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            aria-label="Anterior"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              light
                ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                : "border border-slate-200 bg-white text-navy-900"
            }`}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              light
                ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                : "border border-slate-200 bg-white text-navy-900"
            }`}
            onClick={() => move(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={ref} className="carousel items-stretch">
        {children}
      </div>
    </div>
  );
}

function InstallmentPlan({
  credit,
  credits,
  onSelect,
}: {
  credit: PortalCredit;
  credits: PortalCredit[];
  onSelect: (id: string) => void;
}) {
  const pending = credit.installments.filter((item) => item.status !== "PAID");
  const next = pending[0];
  const paidCount = credit.installments.length - pending.length;
  const percent = credit.installments.length === 0 ? 0 : Math.round((paidCount / credit.installments.length) * 100);

  return (
    <div className="panel mt-4 overflow-hidden">
      {credits.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
          {credits.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
                item.id === credit.id ? "bg-navy-900 text-white" : "bg-slate-100 text-navy-800"
              }`}
              onClick={() => onSelect(item.id)}
            >
              {item.product.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm text-slate-500">Plan de cuotas</p>
          <h3 className="font-display text-xl font-semibold">{credit.product.name}</h3>
        </div>
        <p className="text-sm font-medium text-navy-800">
          {paidCount} de {credit.installments.length} pagadas
        </p>
      </div>
      <div className="px-5 py-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gold-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <ul className={`space-y-2 px-4 pb-4 ${credit.installments.length > 8 ? "max-h-[28rem] overflow-y-auto" : ""}`}>
        {credit.installments.map((item) => {
          const status = effectiveInstallmentStatus(item.status, item.dueDate);
          const isNext = next?.id === item.id;
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${isNext ? "bg-gold-50" : "bg-slate-50"}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                status === "PAID" ? "bg-emerald-100 text-emerald-800" : isNext ? "bg-gold-500 text-navy-950" : "bg-white text-navy-900"
              }`}>
                {item.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{money(item.amount)}</p>
                <p className="text-xs text-slate-500">{formatDate(item.dueDate)}</p>
              </div>
              <InstallmentBadge status={item.status} dueDate={item.dueDate} />
            </li>
          );
        })}
      </ul>
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
      className={`carousel-item flex h-full w-64 flex-col overflow-hidden rounded-2xl border bg-white text-navy-900 ${
        active ? "border-gold-500 shadow-card" : "border-slate-200"
      }`}
    >
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <div className="relative h-36 shrink-0 overflow-hidden bg-slate-100">
          {credit.product.imageUrl ? (
            <img src={mediaUrl(credit.product.imageUrl)} alt={credit.product.name} className="absolute inset-0 h-full w-full object-cover" />
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
  onAsk,
}: {
  product: CatalogProduct;
  busy: boolean;
  onAsk: () => void;
}) {
  return (
    <article className="carousel-item flex h-full w-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-navy-900">
      <div className="relative h-36 shrink-0 overflow-hidden bg-slate-100">
        {product.imageUrl ? (
          <img src={mediaUrl(product.imageUrl)} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
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
          <button className="btn-gold w-full btn-compact" disabled={product.requested || busy} onClick={onAsk}>
            {product.requested ? "Ya solicitado" : "Solicitar"}
          </button>
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
    <div className="login-lock grid min-h-screen lg:grid-cols-2">
      <section className="login-brand relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div>
          <p className="text-gold-300">Tu cuenta · Tus cuotas · Tus facturas</p>
          <h2 className="mt-4 font-display text-5xl font-semibold leading-tight">
            Consulta tu saldo, sube el comprobante y descarga tu factura.
          </h2>
        </div>
        <p className="text-sm text-slate-200">Entra con tu cédula y el teléfono registrado.</p>
      </section>
      <section className="login-panel flex items-center justify-center p-4 lg:p-6">
        <form
          className="login-card w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="lg:hidden">
            <Logo light compact />
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-navy-900 sm:mt-4 sm:text-4xl">Soy cliente</h1>
          <p className="mt-2 text-sm text-slate-500">
            Entra con tu cédula y teléfono.
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
