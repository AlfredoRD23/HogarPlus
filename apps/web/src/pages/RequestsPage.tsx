import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Inbox } from "lucide-react";
import { api, money } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { CatalogBadge, LevelBadge } from "../components/Badges";
import { REQUEST_STATUS_LABELS, type CatalogTier, type ClientLevel, type RequestStatus } from "@hogarplus/shared";

type RequestRow = {
  id: string;
  status: RequestStatus;
  createdAt: string;
  client: { id: string; code: string; firstName: string; lastName: string; phone: string; level: ClientLevel };
  product: { id: string; name: string; catalogTier: CatalogTier; price: number };
};

export function RequestsPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ row: RequestRow; status: RequestStatus } | null>(null);
  const q = useQuery({
    queryKey: ["requests"],
    queryFn: () => api<RequestRow[]>("/api/requests?pageSize=50"),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      api(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Solicitud actualizada");
      qc.invalidateQueries({ queryKey: ["requests"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Solicitudes"
        description="Pedidos que hacen los clientes desde el portal"
        icon={Inbox}
      />
      <DataTable
        title="Cola de solicitudes"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin solicitudes"
        emptyDescription="Cuando un cliente pida un producto, aparece aquí y te llega un aviso."
        headers={["Cliente", "Producto", "Estado", "Acciones"]}
      >
        {rows.map((row) => (
          <tr key={row.id} className="border-t">
            <td className="px-5 py-3.5">
              <Link className="font-semibold" to={`/clientes/${row.client.id}`}>
                {row.client.firstName} {row.client.lastName}
              </Link>
              <div className="mt-1"><LevelBadge level={row.client.level} /></div>
            </td>
            <td className="px-5 py-3.5">
              {row.product.name}
              <div className="mt-1 flex items-center gap-2">
                <CatalogBadge tier={row.product.catalogTier} />
                <span className="text-xs text-slate-500">{money(row.product.price)}</span>
              </div>
            </td>
            <td className="px-5 py-3.5">{REQUEST_STATUS_LABELS[row.status]}</td>
            <td className="px-5 py-3.5">
              {row.status === "PENDING" ? (
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-gold" to={`/creditos/nuevo?clientId=${row.client.id}`}>Crear crédito</Link>
                  <button className="btn-primary" onClick={() => setConfirm({ row, status: "APPROVED" })}>Aprobar</button>
                  <button className="btn-ghost" onClick={() => setConfirm({ row, status: "REJECTED" })}>Rechazar</button>
                </div>
              ) : (
                <Link className="font-semibold text-navy-800" to={`/creditos/nuevo?clientId=${row.client.id}`}>Ir a crédito</Link>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      {confirm && (
        <ConfirmModal
          title={confirm.status === "APPROVED" ? "Aprobar solicitud" : "Rechazar solicitud"}
          message={confirm.status === "APPROVED" ? "Vas a aprobar el pedido de" : "Vas a rechazar el pedido de"}
          itemName={`${confirm.row.client.firstName} ${confirm.row.product.name}`}
          confirmText={confirm.status === "APPROVED" ? "Aprobar" : "Rechazar"}
          loading={update.isPending}
          error={update.error instanceof Error ? update.error.message : undefined}
          consequences={
            confirm.status === "APPROVED"
              ? [
                  "La solicitud queda aprobada",
                  "Aún debes crear el crédito para entregar el producto",
                  "El historial del cliente no se borra",
                ]
              : [
                  "No se borra: queda como rechazada",
                  "El cliente puede volver a pedir el producto",
                  "No se crea ningún crédito",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => update.mutate({ id: confirm.row.id, status: confirm.status })}
        />
      )}
    </div>
  );
}
