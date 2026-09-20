import { Info } from "lucide-react";
import { Modal } from "./Form";

export function InfoModal({
  title,
  message,
  itemName,
  facts = [],
  notes = [],
  actionLabel,
  onAction,
  closeText = "Entendido",
  onClose,
}: {
  title: string;
  message: string;
  itemName?: string;
  facts?: Array<{ label: string; value: string }>;
  notes?: string[];
  actionLabel?: string;
  onAction?: () => void;
  closeText?: string;
  onClose: () => void;
}) {
  return (
    <Modal title={title} zClass="z-[110]" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Info className="h-6 w-6 text-amber-700" />
          </div>
          <p className="text-sm text-slate-700">
            {message}
            {itemName ? (
              <>
                {" "}
                <b className="text-navy-900">{itemName}</b>
              </>
            ) : null}
          </p>
        </div>

        {facts.length > 0 ? (
          <dl className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{fact.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-navy-900">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {notes.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {closeText}
          </button>
          {actionLabel && onAction ? (
            <button type="button" className="btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
