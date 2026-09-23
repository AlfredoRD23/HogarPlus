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
  mobile,
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
  mobile?: ReactNode;
}) {
  const isEmpty = !loading && (rows ?? 0) === 0;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        {typeof count === "number" && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{count}</span>
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
        <>
          {mobile ? <div className="divide-y md:hidden">{mobile}</div> : null}
          <div className={mobile ? "hidden overflow-auto md:block" : "overflow-auto"}>
            <table className="data-table">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
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
        </>
      )}
    </div>
  );
}
