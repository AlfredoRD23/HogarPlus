import type { OutstandingCredit } from "@hogarplus/shared";
import { ApiError, formatDate, money } from "./api";

export function isDebtError(error: unknown): error is ApiError & { details: { credits: OutstandingCredit[] } } {
  return error instanceof ApiError && error.code === "HAS_DEBT";
}

export function creditsFromDebtError(error: unknown): OutstandingCredit[] {
  if (!isDebtError(error)) return [];
  const credits = error.details?.credits;
  return Array.isArray(credits) ? credits : [];
}

export function debtFacts(credit: OutstandingCredit) {
  return [
    { label: "Producto", value: credit.productName },
    { label: "Crédito", value: credit.code },
    { label: "Saldo pendiente", value: money(credit.balance) },
    { label: "Cuota", value: money(credit.weeklyQuota) },
    {
      label: "Cuotas que faltan",
      value: credit.remaining === 1 ? "1 cuota" : `${credit.remaining} cuotas`,
    },
    {
      label: "Próxima cuota",
      value: credit.nextDueDate
        ? `${formatDate(credit.nextDueDate)}${credit.nextAmount != null ? ` · ${money(credit.nextAmount)}` : ""}`
        : "Sin fecha",
    },
    ...(credit.overdueCount > 0
      ? [{ label: "Atraso", value: credit.overdueCount === 1 ? "1 cuota atrasada" : `${credit.overdueCount} cuotas atrasadas` }]
      : []),
  ];
}

export function debtNotes(credit: OutstandingCredit) {
  return [
    "No se abre otro producto hasta saldar este saldo",
    "El historial, las cuotas y los pagos se quedan",
    credit.overdueCount > 0 ? "Hay atraso: cobra primero lo vencido" : "Cuando el saldo llegue a 0, sí se puede entregar otro",
  ];
}
