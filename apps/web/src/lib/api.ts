const TOKEN_KEY = "hogarplus.token";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: { page?: number; pageSize?: number; total?: number; unread?: number };
  error?: { code: string; message: string; details?: unknown };
};

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(message: string, code = "ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const base = import.meta.env.VITE_API_URL ?? "";
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message || "Error de red", json.error?.code, json.error?.details);
  }
  return json;
}

export function mediaUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

export const money = (value: number | string) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(
    Number(value),
  );

export const moneyExact = (value: number | string) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(Number(value));

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
