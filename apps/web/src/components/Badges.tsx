import type { ClientLevel, CreditStatus, InstallmentStatus } from "@hogarplus/shared";

const levelClass: Record<ClientLevel, string> = {
  INICIAL: "bg-slate-100 text-slate-700",
  BRONCE: "bg-amber-100 text-amber-800",
  PLATA: "bg-slate-200 text-slate-800",
  ORO: "bg-gold-100 text-gold-600",
};

const creditClass: Record<CreditStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-navy-900 text-gold-300",
  DEFAULTED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function Badge({ children, className }: { children: string; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${className}`}>{children}</span>;
}

export function LevelBadge({ level }: { level: ClientLevel }) {
  return <Badge className={levelClass[level]}>{level}</Badge>;
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

export function InstallmentBadge({ status }: { status: InstallmentStatus }) {
  const map: Record<InstallmentStatus, [string, string]> = {
    PENDING: ["Pendiente", "bg-slate-100 text-slate-700"],
    PAID: ["Pagada", "bg-emerald-50 text-emerald-700"],
    PARTIAL: ["Parcial", "bg-amber-50 text-amber-700"],
    OVERDUE: ["Vencida", "bg-rose-50 text-rose-700"],
    PREPAID: ["Adelantada", "bg-sky-50 text-sky-700"],
  };
  const [label, cls] = map[status];
  return <Badge className={cls}>{label}</Badge>;
}
