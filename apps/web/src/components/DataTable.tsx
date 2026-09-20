import type { ReactNode } from "react";
import { EmptyState } from "./PageHeader";

export function DataTable({
  title,
  count,
  loading,
  emptyTitle,
  emptyDescription,
  emptyAction,
  headers,
  children,
  rows,
}: {
  title: string;
  count?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  headers: string[];
  children: ReactNode;
  rows?: number;
}) {
  const isEmpty = !loading && (rows ?? 0) === 0;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="font-display text-lg">{title}</h3>
        {typeof count === "number" && (
          <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-navy-900">{count}</span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="p-4">
          <EmptyState title={emptyTitle ?? "Sin registros"} description={emptyDescription ?? "Aún no hay datos en esta lista."} action={emptyAction} />
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="data-table">
            <thead className="bg-navy-900 text-xs uppercase tracking-wide text-gold-300">
              <tr>
                {headers.map((h) => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
