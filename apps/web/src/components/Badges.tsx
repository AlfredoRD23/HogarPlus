import type { CatalogTier, ClientLevel, CreditStatus, InstallmentStatus } from "@hogarplus/shared";
import { CATALOG_TIER_LABELS, effectiveInstallmentStatus, LEVEL_LABELS } from "@hogarplus/shared";
import { TIER_TONE } from "../lib/catalogTiers";

const levelClass: Record<ClientLevel, string> = {
  INICIAL: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  BRONCE: `${TIER_TONE.A.soft} ${TIER_TONE.A.softText} ring-1 ${TIER_TONE.A.ring}`,
  PLATA: `${TIER_TONE.B.soft} ${TIER_TONE.B.softText} ring-1 ${TIER_TONE.B.ring}`,
  ORO: `${TIER_TONE.C.soft} ${TIER_TONE.C.softText} ring-1 ${TIER_TONE.C.ring}`,
};

const creditClass: Record<CreditStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  DEFAULTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function Badge({ children, className }: { children: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>{children}</span>;
}

export function LevelBadge({ level }: { level: ClientLevel }) {
  return <Badge className={levelClass[level]}>{LEVEL_LABELS[level]}</Badge>;
}

export function CreditBadge({ status }: { status: CreditStatus }) {
  const labels: Record<CreditStatus, string> = {
    DRAFT: "Borrador",
    ACTIVE: "Activo",
    COMPLETED: "Completado",
    DEFAULTED: "Mora grave",
    CANCELLED: "Cancelado",
  };
  return <Badge className={creditClass[status]}>{labels[status]}</Badge>;
}

export function CatalogBadge({ tier }: { tier: CatalogTier }) {
  const tone = TIER_TONE[tier];
  return (
    <Badge className={`${tone.soft} ${tone.softText} ring-1 ${tone.ring} font-semibold`}>
      {CATALOG_TIER_LABELS[tier]}
    </Badge>
  );
}

export function InstallmentBadge({ status, dueDate }: { status: InstallmentStatus; dueDate?: string | Date }) {
  const resolved = dueDate ? effectiveInstallmentStatus(status, dueDate) : status;
  const map: Record<InstallmentStatus, [string, string]> = {
    PENDING: ["Pendiente", "bg-slate-100 text-slate-700"],
    PAID: ["Pagada", "bg-emerald-50 text-emerald-700"],
    PARTIAL: ["Parcial", "bg-amber-50 text-amber-700"],
    OVERDUE: ["Atrasada", "bg-rose-50 text-rose-700"],
    PREPAID: ["Adelantada", "bg-sky-50 text-sky-700"],
  };
  const [label, cls] = map[resolved];
  return <Badge className={cls}>{label}</Badge>;
}
