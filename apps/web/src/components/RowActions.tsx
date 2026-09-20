import { Ban, MoreHorizontal, Pencil, RotateCcw, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RowActionItem = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  danger?: boolean;
};

export function RowActions({
  active = true,
  onEdit,
  onDeactivate,
  onActivate,
  deactivateLabel = "Desactivar",
  activateLabel = "Activar",
  extra = [],
}: {
  active?: boolean;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  deactivateLabel?: string;
  activateLabel?: string;
  extra?: RowActionItem[];
}) {
  const items: RowActionItem[] = [
    ...(onEdit ? [{ label: "Editar", icon: Pencil, onClick: onEdit }] : []),
    ...(active && onDeactivate
      ? [{ label: deactivateLabel, icon: Ban, onClick: onDeactivate, danger: true }]
      : []),
    ...(!active && onActivate
      ? [{ label: activateLabel, icon: RotateCcw, onClick: onActivate }]
      : []),
    ...extra,
  ];

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 208;
    const estimatedHeight = items.length * 42 + 12;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Acciones"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy-800"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={16} className={`transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[120] w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${
                      item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                  >
                    {Icon ? <Icon size={16} /> : null}
                    {item.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
