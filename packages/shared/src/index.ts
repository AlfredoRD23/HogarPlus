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

export const PAYMENT_TYPES = ["AFFILIATION", "INSTALLMENT", "ADVANCE"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

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
  REFERRAL: 30,
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
  REFERRAL: "Referido",
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
};

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
