import { useEffect, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import {
  formatCedula,
  formatCity,
  formatEmailInput,
  formatIntegerInput,
  formatMoneyInput,
  formatNote,
  formatPercentInput,
  formatPersonName,
  formatPhoneRD,
  formatProductName,
  formatReference,
  formatUrlInput,
} from "@hogarplus/shared";

export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  zClass = "z-[100]",
  size = "md",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  zClass?: string;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div className={`modal-overlay ${zClass}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`modal-panel ${size === "lg" ? "modal-panel-lg" : ""}`}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-lg font-semibold text-navy-900">
              {title}
            </h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-sm font-semibold text-slate-500 hover:text-navy-900">
            Cerrar
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="shrink-0 border-t bg-white px-5 py-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormGrid({ children, onSubmit }: { children: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export type InputKind =
  | "cedula"
  | "phone"
  | "name"
  | "city"
  | "email"
  | "password"
  | "money"
  | "integer"
  | "percent"
  | "date"
  | "text"
  | "productName"
  | "reference"
  | "note"
  | "url";

function formatByKind(kind: InputKind, value: string): string {
  switch (kind) {
    case "cedula":
      return formatCedula(value);
    case "phone":
      return formatPhoneRD(value);
    case "name":
      return formatPersonName(value);
    case "city":
      return formatCity(value);
    case "email":
      return formatEmailInput(value);
    case "password":
      return value.replace(/\s/g, "").slice(0, 72);
    case "money":
      return formatMoneyInput(value);
    case "integer":
      return formatIntegerInput(value);
    case "percent":
      return formatPercentInput(value);
    case "date":
      return value;
    case "text":
      return value.slice(0, 80);
    case "productName":
      return formatProductName(value);
    case "reference":
      return formatReference(value);
    case "note":
      return formatNote(value);
    case "url":
      return formatUrlInput(value);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function kindMeta(kind: InputKind) {
  switch (kind) {
    case "cedula":
      return { placeholder: "000-0000000-0", inputMode: "numeric" as const, maxLength: 13, autoComplete: "off", hint: "Formato 000-0000000-0" };
    case "phone":
      return { placeholder: "809-000-0000", inputMode: "tel" as const, maxLength: 12, autoComplete: "tel", hint: "809, 829 o 849" };
    case "name":
      return { placeholder: "Solo letras", inputMode: "text" as const, maxLength: 60, autoComplete: "name", hint: "Solo letras" };
    case "city":
      return { placeholder: "Santo Domingo", inputMode: "text" as const, maxLength: 50, autoComplete: "address-level2", hint: "Solo letras" };
    case "email":
      return { placeholder: "correo@dominio.com", inputMode: "email" as const, maxLength: 120, autoComplete: "email", hint: "correo@dominio.com" };
    case "password":
      return { placeholder: "Mínimo 8 caracteres", inputMode: "text" as const, maxLength: 72, autoComplete: "new-password", hint: "Mínimo 8 caracteres, sin espacios" };
    case "money":
      return { placeholder: "0.00", inputMode: "decimal" as const, maxLength: 12, autoComplete: "off", hint: "RD$ con hasta 2 decimales" };
    case "integer":
      return { placeholder: "0", inputMode: "numeric" as const, maxLength: 7, autoComplete: "off", hint: "Solo números enteros" };
    case "percent":
      return { placeholder: "0", inputMode: "decimal" as const, maxLength: 6, autoComplete: "off", hint: "Entre 0 y 100" };
    case "date":
      return { placeholder: "", inputMode: "text" as const, maxLength: 10, autoComplete: "off", hint: "AAAA-MM-DD" };
    case "text":
      return { placeholder: "", inputMode: "text" as const, maxLength: 80, autoComplete: "off", hint: undefined };
    case "productName":
      return { placeholder: "Nombre del producto", inputMode: "text" as const, maxLength: 80, autoComplete: "off", hint: "Debe incluir letras" };
    case "reference":
      return { placeholder: "REF-0001", inputMode: "text" as const, maxLength: 30, autoComplete: "off", hint: "Solo letras, números y guion" };
    case "note":
      return { placeholder: "Escribe el detalle", inputMode: "text" as const, maxLength: 400, autoComplete: "off", hint: "Mínimo 3 caracteres" };
    case "url":
      return { placeholder: "https://maps.google.com/...", inputMode: "url" as const, maxLength: 500, autoComplete: "url", hint: "Pega el link de Google Maps" };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

type FormattedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  kind: Exclude<InputKind, "note">;
  value: string;
  onValue: (value: string) => void;
  error?: boolean;
};

export function FormattedInput({
  kind,
  value,
  onValue,
  error,
  className,
  ...rest
}: FormattedInputProps) {
  const meta = kindMeta(kind);
  const type = kind === "password" ? "password" : kind === "email" ? "email" : kind === "date" ? "date" : kind === "url" ? "url" : "text";
  return (
    <input
      {...rest}
      type={type}
      inputMode={meta.inputMode}
      maxLength={meta.maxLength}
      autoComplete={rest.autoComplete ?? meta.autoComplete}
      placeholder={rest.placeholder ?? meta.placeholder}
      className={`${className ?? "input"} ${error ? "input-error" : ""}`}
      value={value}
      aria-invalid={error || undefined}
      onChange={(event) => onValue(formatByKind(kind, event.target.value))}
    />
  );
}

type FormattedTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValue: (value: string) => void;
  error?: boolean;
};

export function FormattedTextarea({ value, onValue, error, className, ...rest }: FormattedTextareaProps) {
  const meta = kindMeta("note");
  return (
    <textarea
      {...rest}
      maxLength={meta.maxLength}
      placeholder={rest.placeholder ?? meta.placeholder}
      className={`${className ?? "input min-h-24"} ${error ? "input-error" : ""}`}
      value={value}
      aria-invalid={error || undefined}
      onChange={(event) => onValue(formatByKind("note", event.target.value))}
    />
  );
}

export function fieldHint(kind: InputKind): string | undefined {
  return kindMeta(kind).hint;
}
