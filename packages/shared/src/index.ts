export const ROLES = [
  "DIRECCION",
  "VENTAS",
  "COBRANZA",
  "INVENTARIO",
  "ADMINISTRACION",
  "TECNOLOGIA",
] as const;

export type Role = (typeof ROLES)[number];

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_LEVELS = ["INICIAL", "BRONCE", "PLATA", "ORO"] as const;
export type ClientLevel = (typeof CLIENT_LEVELS)[number];

export const CATALOG_TIERS = ["A", "B", "C"] as const;
export type CatalogTier = (typeof CATALOG_TIERS)[number];

export const PRODUCT_CATEGORIES = ["SALUD_BIENESTAR", "BELLEZA", "HOGAR"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CREDIT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "DEFAULTED",
  "CANCELLED",
] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  "PENDING",
  "PAID",
  "PARTIAL",
  "OVERDUE",
  "PREPAID",
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "DEPOSIT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_TYPES = ["AFFILIATION", "INSTALLMENT", "ADVANCE", "DOWN_PAYMENT"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export const INVENTORY_MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT"] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const POINTS_ACTIONS = [
  "WEEKLY_ON_TIME",
  "ADVANCE",
  "AFFILIATION",
  "REFERRAL",
  "PRODUCT_COMPLETED",
  "LATE_PAYMENT",
] as const;
export type PointsAction = (typeof POINTS_ACTIONS)[number];

export const COLLECTION_BUCKETS = [
  "ON_TIME",
  "DUE_TODAY",
  "OVERDUE",
  "ADVANCED",
] as const;
export type CollectionBucket = (typeof COLLECTION_BUCKETS)[number];

export const LEVEL_RANGES: Record<ClientLevel, { min: number; max: number }> = {
  INICIAL: { min: 0, max: 99 },
  BRONCE: { min: 100, max: 249 },
  PLATA: { min: 250, max: 499 },
  ORO: { min: 500, max: Number.POSITIVE_INFINITY },
};

export const POINTS_RULES: Record<PointsAction, number> = {
  WEEKLY_ON_TIME: 10,
  ADVANCE: 15,
  AFFILIATION: 20,
  REFERRAL: 5,
  PRODUCT_COMPLETED: 50,
  LATE_PAYMENT: 0,
};

export const DEFAULTS = {
  affiliationFee: 100,
  weeklyQuota: 300,
  productCost: 1000,
  productPrice: 3000,
  weeks: 10,
  currency: "DOP",
  locale: "es-DO",
} as const;

export function levelFromPoints(points: number): ClientLevel {
  if (points >= 500) return "ORO";
  if (points >= 250) return "PLATA";
  if (points >= 100) return "BRONCE";
  return "INICIAL";
}

export const CATALOG_TIER_LABELS: Record<CatalogTier, string> = {
  A: "Bronce",
  B: "Plata",
  C: "Oro",
};

export const POINTS_ACTION_LABELS: Record<PointsAction, string> = {
  WEEKLY_ON_TIME: "Cuota a tiempo",
  ADVANCE: "Adelanto",
  AFFILIATION: "Afiliación",
  REFERRAL: "Referido exitoso",
  PRODUCT_COMPLETED: "Producto completado",
  LATE_PAYMENT: "Pago atrasado",
};

export function progressToNextLevel(points: number): { next: ClientLevel | null; remaining: number } {
  if (points < 100) return { next: "BRONCE", remaining: 100 - points };
  if (points < 250) return { next: "PLATA", remaining: 250 - points };
  if (points < 500) return { next: "ORO", remaining: 500 - points };
  return { next: null, remaining: 0 };
}

export function catalogsForLevel(level: ClientLevel): CatalogTier[] {
  switch (level) {
    case "INICIAL":
      return ["A"];
    case "BRONCE":
      return ["A", "B"];
    case "PLATA":
      return ["A", "B", "C"];
    case "ORO":
      return ["A", "B", "C"];
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function catalogAccessLabel(level: ClientLevel): string {
  return catalogsForLevel(level)
    .map((tier) => CATALOG_TIER_LABELS[tier])
    .join(", ");
}

export function requiredLevelForTier(tier: CatalogTier): ClientLevel {
  switch (tier) {
    case "A":
      return "INICIAL";
    case "B":
      return "BRONCE";
    case "C":
      return "PLATA";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export function productRequestAccess(
  level: ClientLevel,
  tier: CatalogTier,
  catalogApproved: boolean,
  hasDebt = false,
): { canRequest: boolean; lockReason: string | null } {
  if (hasDebt) {
    return {
      canRequest: false,
      lockReason: "Debes saldar tu producto anterior antes de pedir otro",
    };
  }
  if (!catalogsForLevel(level).includes(tier)) {
    const need = requiredLevelForTier(tier);
    return {
      canRequest: false,
      lockReason: `No puedes solicitarlo hasta subir a ${LEVEL_LABELS[need]}`,
    };
  }
  if (tier === "C" && !catalogApproved) {
    return {
      canRequest: false,
      lockReason: "No puedes solicitarlo hasta que aprueben tu categoría Oro",
    };
  }
  return { canRequest: true, lockReason: null };
}

export const REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export const NOTIFICATION_TYPES = ["PRODUCT_REQUEST", "COLLECT_ME", "REFERRAL_LEAD", "REFERRAL_REGISTERED", "PAYMENT_CLAIM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PAYMENT_CLAIM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PaymentClaimStatus = (typeof PAYMENT_CLAIM_STATUSES)[number];

export const PAYMENT_CLAIM_STATUS_LABELS: Record<PaymentClaimStatus, string> = {
  PENDING: "Por validar",
  APPROVED: "Pago recibido",
  REJECTED: "Rechazado",
};

export const REFERRAL_STATUSES = ["PENDING", "REGISTERED", "CANCELLED"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: "Pendiente de entrar",
  REGISTERED: "Ya es cliente",
  CANCELLED: "Cancelado",
};

export type OutstandingCredit = {
  id: string;
  code: string;
  productName: string;
  balance: number;
  weeklyQuota: number;
  remaining: number;
  nextDueDate: string | null;
  nextAmount: number | null;
  overdueCount: number;
};

export function normalizePersonKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function namesLookAlike(left: string, right: string) {
  const a = normalizePersonKey(left);
  const b = normalizePersonKey(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function catalogTierLabel(tier: CatalogTier | string): string {
  return CATALOG_TIER_LABELS[tier as CatalogTier] ?? tier;
}

export function effectiveInstallmentStatus(
  status: InstallmentStatus,
  dueDate: string | Date,
  now = new Date(),
): InstallmentStatus {
  if (status === "PAID" || status === "PREPAID") return status;
  if (calendarDaysLate(dueDate, now) > 0) return "OVERDUE";
  return status;
}

export function calendarDaysLate(dueDate: string | Date, now = new Date()): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000));
}

export function slaDelayLabel(days: number): string {
  if (days <= 0) return "Al día";
  if (days === 1) return "1 día";
  if (days < 7) return `${days} días`;
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  if (rest === 0) return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  return `${weeks} sem. y ${rest} d.`;
}

export const ROLE_LABELS: Record<Role, string> = {
  DIRECCION: "Dirección",
  VENTAS: "Ventas",
  COBRANZA: "Cobranza",
  INVENTARIO: "Inventario",
  ADMINISTRACION: "Administración",
  TECNOLOGIA: "Tecnología",
};

export const APP_MODULES = [
  "dashboard",
  "clientes",
  "productos",
  "creditos",
  "pagos",
  "cobranza",
  "rutas",
  "solicitudes",
  "inventario",
  "gastos",
  "reportes",
  "usuarios",
  "configuracion",
] as const;

export type AppModule = (typeof APP_MODULES)[number];

export const ROLE_HOME: Record<Role, string> = {
  DIRECCION: "/dashboard",
  ADMINISTRACION: "/dashboard",
  VENTAS: "/clientes",
  COBRANZA: "/pagos",
  INVENTARIO: "/productos",
  TECNOLOGIA: "/usuarios",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  DIRECCION: "Ve y gestiona todo el sistema",
  ADMINISTRACION: "Ve y gestiona todo el sistema",
  VENTAS: "Clientes, créditos y pagos",
  COBRANZA: "Solo pagos",
  INVENTARIO: "Catálogo e inventario",
  TECNOLOGIA: "Usuarios y configuración",
};

const ROLE_MODULES: Record<Role, readonly AppModule[]> = {
  DIRECCION: APP_MODULES,
  ADMINISTRACION: APP_MODULES,
  VENTAS: ["clientes", "creditos", "pagos"],
  COBRANZA: ["pagos"],
  INVENTARIO: ["productos", "inventario"],
  TECNOLOGIA: ["usuarios", "configuracion"],
};

const PATH_MODULES: Array<[string, AppModule]> = [
  ["/dashboard", "dashboard"],
  ["/clientes", "clientes"],
  ["/productos", "productos"],
  ["/inventario", "inventario"],
  ["/creditos", "creditos"],
  ["/pagos", "pagos"],
  ["/cobranza", "cobranza"],
  ["/rutas", "rutas"],
  ["/solicitudes", "solicitudes"],
  ["/reportes", "reportes"],
  ["/gastos", "gastos"],
  ["/usuarios", "usuarios"],
  ["/configuracion", "configuracion"],
];

export function hasFullAccess(role: Role): boolean {
  return role === "DIRECCION" || role === "ADMINISTRACION";
}

export function canAccessModule(role: Role, moduleId: AppModule): boolean {
  return ROLE_MODULES[role].includes(moduleId);
}

export function homePathFor(role: Role): string {
  return ROLE_HOME[role];
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const match = PATH_MODULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!match) return true;
  return canAccessModule(role, match[1]);
}

export function rolesForModule(moduleId: AppModule): Role[] {
  return ROLES.filter((role) => canAccessModule(role, moduleId));
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  SALUD_BIENESTAR: "Salud y bienestar",
  BELLEZA: "Belleza y cuidado personal",
  HOGAR: "Hogar y artículos",
};

export const LEVEL_LABELS: Record<ClientLevel, string> = {
  INICIAL: "Inicial",
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  DEPOSIT: "Depósito",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  AFFILIATION: "Afiliación",
  INSTALLMENT: "Cuota",
  ADVANCE: "Adelanto",
  DOWN_PAYMENT: "Pago inicial",
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export const PAYMENT_FREQUENCY_UNIT: Record<PaymentFrequency, string> = {
  WEEKLY: "semanas",
  BIWEEKLY: "quincenas",
  MONTHLY: "meses",
};

export function roundMoney2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function financedAmount(price: number, downPayment: number): number {
  return roundMoney2(Math.max(0, price - Math.max(0, downPayment)));
}

export function quotaFromInstallments(price: number, downPayment: number, installments: number): number {
  const financed = financedAmount(price, downPayment);
  if (installments < 1) return 0;
  return roundMoney2(financed / installments);
}

export function installmentsFromQuota(price: number, downPayment: number, quota: number): number {
  const financed = financedAmount(price, downPayment);
  if (quota <= 0) return 1;
  return Math.max(1, Math.min(104, Math.ceil(financed / quota - 1e-9)));
}

export function installmentAmounts(price: number, downPayment: number, installments: number): number[] {
  const count = Math.max(1, installments);
  const financed = financedAmount(price, downPayment);
  const quota = roundMoney2(financed / count);
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? roundMoney2(financed - quota * (count - 1)) : quota,
  );
}

export function addByFrequency(date: Date, frequency: PaymentFrequency, index: number): Date {
  const next = new Date(date);
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + index * 7);
      return next;
    case "BIWEEKLY":
      next.setDate(next.getDate() + index * 14);
      return next;
    case "MONTHLY":
      next.setMonth(next.getMonth() + index);
      return next;
    default: {
      const _exhaustive: never = frequency;
      return _exhaustive;
    }
  }
}

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  IN: "Entrada",
  OUT: "Salida",
  ADJUSTMENT: "Ajuste",
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export * from "./formats";
