import type { ReactNode } from "react";

export type TableCardField = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
};

export function TableCard({
  title,
  subtitle,
  photo,
  initials,
  badge,
  fields,
  actions,
  muted,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  photo?: string | null;
  initials?: string;
  badge?: ReactNode;
  fields: TableCardField[];
  actions?: ReactNode;
  muted?: boolean;
}) {
  return (
    <article className={`px-4 py-4 ${muted ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
        {photo ? (
          <img src={photo} alt="" className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-cover object-top" />
        ) : (
          <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-lg font-bold uppercase text-gold-300">
            {(initials ?? "?").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold text-navy-800">{title}</div>
          {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
          {badge ? <div className="mt-1 flex flex-wrap items-center gap-2">{badge}</div> : null}
        </div>
      </div>
      {fields.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{field.label}</dt>
              <dd className="mt-0.5">{field.value}</dd>
              {field.hint ? <dd className="truncate text-xs text-slate-500">{field.hint}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? <div className="mt-3">{actions}</div> : null}
    </article>
  );
}
