import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type HeaderAction = {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: "primary" | "gold" | "ghost";
  href?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actions = [],
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: HeaderAction[];
}) {
  return (
    <div className="page-header">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight text-navy-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        {onSearchChange && (
          <div className="relative w-full min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="search-input"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {actions.map((action) => {
          const ActionIcon = action.icon;
          const cls =
            action.variant === "primary" ? "btn-primary" : action.variant === "gold" ? "btn-gold" : "btn-ghost";
          if (action.href) {
            return (
              <Link key={action.label} className={cls} to={action.href}>
                {ActionIcon && <ActionIcon size={16} />}
                {action.label}
              </Link>
            );
          }
          return (
            <button key={action.label} type="button" className={cls} onClick={action.onClick}>
              {ActionIcon && <ActionIcon size={16} />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="text-xl font-semibold text-navy-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function FilterBar({ children, onClear, active }: { children: ReactNode; onClear?: () => void; active?: boolean }) {
  return (
    <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      {children}
      {onClear && active && (
        <button type="button" className="btn-ghost" onClick={onClear}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
