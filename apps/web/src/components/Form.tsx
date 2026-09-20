import type { FormEvent, ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <div className="panel w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between bg-navy-900 px-5 py-4 text-white">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="text-gold-300">
            Cerrar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
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
