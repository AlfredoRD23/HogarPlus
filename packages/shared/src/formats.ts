export const RD_AREA_CODES = ["809", "829", "849"] as const;

export function digitsOnly(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatCedula(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
}

function cedulaCheckDigit(first10: string): number {
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    let product = Number(first10[i]) * weights[i];
    if (product >= 10) product = Math.floor(product / 10) + (product % 10);
    sum += product;
  }
  return (10 - (sum % 10)) % 10;
}

export function withCedulaCheckDigit(first10: string): string {
  const base = digitsOnly(first10).padStart(10, "0").slice(0, 10);
  return `${base}${cedulaCheckDigit(base)}`;
}

export function isValidCedula(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return false;
  if (digits === "00000000000") return false;
  return cedulaCheckDigit(digits.slice(0, 10)) === Number(digits[10]);
}

export function cedulaError(value: string): string | null {
  const digits = digitsOnly(value);
  if (!digits) return "La cédula es obligatoria";
  if (digits.length !== 11) return "La cédula debe tener 11 dígitos (000-0000000-0)";
  if (!isValidCedula(value)) return "La cédula no es válida. Revisa el dígito verificador";
  return null;
}

export function formatPhoneRD(value: string): string {
  const digits = digitsOnly(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidPhoneRD(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length !== 10) return false;
  return (RD_AREA_CODES as readonly string[]).includes(digits.slice(0, 3));
}

export function phoneError(value: string, required = true): string | null {
  const digits = digitsOnly(value);
  if (!digits) return required ? "El teléfono es obligatorio" : null;
  if (digits.length !== 10) return "El teléfono debe tener 10 dígitos (809-000-0000)";
  if (!isValidPhoneRD(value)) return "El teléfono debe iniciar con 809, 829 o 849";
  return null;
}

export function formatPersonName(value: string): string {
  return String(value ?? "")
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, "")
    .replace(/ {2,}/g, " ")
    .slice(0, 60);
}

export function personNameError(value: string, label = "nombre"): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) return `El ${label} debe tener al menos 2 letras`;
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '’-]?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/.test(trimmed)) {
    return `El ${label} solo puede incluir letras`;
  }
  return null;
}

export function formatCity(value: string): string {
  return String(value ?? "")
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]/g, "")
    .replace(/ {2,}/g, " ")
    .slice(0, 50);
}

export function cityError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "La ciudad debe tener al menos 2 letras";
  return null;
}

export function formatEmailInput(value: string): string {
  return String(value ?? "").replace(/\s/g, "").toLowerCase().slice(0, 120);
}

export function isValidEmail(value: string): boolean {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value.trim());
}

export function emailError(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "El correo es obligatorio" : null;
  if (!isValidEmail(trimmed)) return "El correo no tiene un formato válido";
  return null;
}

export function passwordError(value: string, required = true): string | null {
  if (!value) return required ? "La contraseña es obligatoria" : null;
  if (/\s/.test(value)) return "La contraseña no puede tener espacios";
  if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (value.length > 72) return "La contraseña es demasiado larga";
  return null;
}

export function formatMoneyInput(value: string): string {
  const sanitized = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  const separatorIndex = sanitized.indexOf(".");
  const hasSeparator = separatorIndex >= 0;
  const integerSource = hasSeparator ? sanitized.slice(0, separatorIndex) : sanitized;
  const decimalSource = hasSeparator ? sanitized.slice(separatorIndex + 1).replace(/\./g, "") : "";
  const normalizedInteger = integerSource.replace(/^0+(?=\d)/, "").slice(0, 9);
  const normalizedDecimal = decimalSource.slice(0, 2);
  if (!hasSeparator) return normalizedInteger;
  const safeInteger = normalizedInteger || "0";
  if (normalizedDecimal.length > 0) return `${safeInteger}.${normalizedDecimal}`;
  return sanitized.endsWith(".") ? `${safeInteger}.` : safeInteger;
}

export function parseMoney(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const parsed = Number(formatMoneyInput(value));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function moneyError(
  value: string | number,
  { allowZero = false, label = "monto" }: { allowZero?: boolean; label?: string } = {},
): string | null {
  const amount = parseMoney(value);
  if (!Number.isFinite(amount)) return `El ${label} no es válido`;
  if (amount < 0) return `El ${label} no puede ser negativo`;
  if (!allowZero && amount <= 0) return `El ${label} debe ser mayor que 0`;
  if (amount > 9_999_999.99) return `El ${label} es demasiado alto`;
  return null;
}

export function formatIntegerInput(value: string): string {
  return digitsOnly(value).replace(/^0+(?=\d)/, "").slice(0, 7);
}

export function parseInteger(value: string | number): number {
  if (typeof value === "number") return Number.isInteger(value) ? value : Number.NaN;
  const digits = formatIntegerInput(value);
  if (!digits) return Number.NaN;
  return Number(digits);
}

export function integerError(
  value: string | number,
  { min = 1, max = 999_999, label = "cantidad" }: { min?: number; max?: number; label?: string } = {},
): string | null {
  const parsed = parseInteger(value);
  if (!Number.isInteger(parsed)) return `La ${label} debe ser un número entero`;
  if (parsed < min) return `La ${label} mínima es ${min}`;
  if (parsed > max) return `La ${label} máxima es ${max}`;
  return null;
}

export function formatPercentInput(value: string): string {
  const formatted = formatMoneyInput(value);
  const amount = Number(formatted.replace(/\.$/, ""));
  if (Number.isFinite(amount) && amount > 100) return "100";
  return formatted;
}

export function percentError(value: string | number): string | null {
  const amount = parseMoney(value);
  if (!Number.isFinite(amount)) return "El porcentaje no es válido";
  if (amount < 0 || amount > 100) return "El porcentaje debe estar entre 0 y 100";
  return null;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function dateError(value: string, { allowFuture = false }: { allowFuture?: boolean } = {}): string | null {
  if (!isValidIsoDate(value)) return "La fecha no es válida";
  if (!allowFuture) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return "La fecha no puede ser futura";
  }
  return null;
}

export function formatReference(value: string): string {
  return String(value ?? "")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 30);
}

export function referenceError(value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? "La referencia es obligatoria para transferencia o depósito" : null;
  if (trimmed.length < 4) return "La referencia debe tener al menos 4 caracteres";
  return null;
}

export function formatNote(value: string): string {
  return String(value ?? "").replace(/[<>]/g, "").slice(0, 400);
}

export function noteError(value: string, { min = 3, label = "nota" }: { min?: number; label?: string } = {}): string | null {
  const trimmed = value.trim();
  if (trimmed.length < min) return `La ${label} debe tener al menos ${min} caracteres`;
  return null;
}

export function productNameError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) return "El nombre del producto debe tener al menos 2 caracteres";
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(trimmed)) return "El nombre del producto debe incluir letras";
  return null;
}

export function formatProductName(value: string): string {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/ {2,}/g, " ")
    .slice(0, 80);
}

export function firstError(errors: Array<string | null | undefined>): string | null {
  return errors.find((item): item is string => Boolean(item)) ?? null;
}

export function formatUrlInput(value: string): string {
  return String(value ?? "").replace(/\s/g, "").slice(0, 500);
}

export function locationUrlError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "El link debe empezar con http o https";
    }
    return null;
  } catch {
    return "Pega un link válido de Google Maps o ubicación";
  }
}
