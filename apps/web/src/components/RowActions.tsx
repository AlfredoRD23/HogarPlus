import { Pencil } from "lucide-react";

export function RowActions({
  active = true,
  onEdit,
  onDeactivate,
  onActivate,
  deactivateLabel = "Desactivar",
  activateLabel = "Activar",
}: {
  active?: boolean;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  deactivateLabel?: string;
  activateLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onEdit ? (
        <button type="button" className="btn-ghost btn-compact" onClick={onEdit}>
          <Pencil size={14} /> Editar
        </button>
      ) : null}
      {active && onDeactivate ? (
        <button type="button" className="btn-danger btn-compact" onClick={onDeactivate}>
          {deactivateLabel}
        </button>
      ) : null}
      {!active && onActivate ? (
        <button type="button" className="btn-gold btn-compact" onClick={onActivate}>
          {activateLabel}
        </button>
      ) : null}
    </div>
  );
}
