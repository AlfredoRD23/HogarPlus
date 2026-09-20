import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Form";

export function ConfirmModal({
  title,
  message,
  itemName,
  consequences,
  confirmText = "Confirmar",
  loadingText = "Procesando...",
  cancelText = "Cancelar",
  loading = false,
  error,
  irreversible = false,
  requireReason = false,
  reasonLabel = "Motivo",
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  itemName?: string;
  consequences: string[];
  confirmText?: string;
  loadingText?: string;
  cancelText?: string;
  loading?: boolean;
  error?: string;
  irreversible?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  return (
    <Modal title={title} zClass="z-[110]" onClose={loading ? () => undefined : onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div>
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
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Qué pasa si continúas</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {irreversible && (
          <p className="text-sm font-semibold text-rose-700">Esta acción no se puede deshacer.</p>
        )}

        {requireReason && (
          <label className="block">
            <span className="label">{reasonLabel}</span>
            <textarea
              className={`input min-h-24 ${reasonError ? "input-error" : ""}`}
              value={reason}
              maxLength={400}
              placeholder="Explica por qué"
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError("");
              }}
            />
            {reasonError ? <span className="mt-1 block text-xs text-rose-600">{reasonError}</span> : null}
          </label>
        )}

        {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" disabled={loading} onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={loading}
            onClick={() => {
              if (requireReason && reason.trim().length < 5) {
                setReasonError("El motivo debe tener al menos 5 caracteres");
                return;
              }
              onConfirm(reason.trim() || undefined);
            }}
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
