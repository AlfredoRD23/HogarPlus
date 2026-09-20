import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Inbox } from "lucide-react";
import { api, formatDate, mediaUrl, money } from "../lib/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { RowActions } from "../components/RowActions";
import { TableCard } from "../components/TableCard";
import { CatalogBadge, LevelBadge } from "../components/Badges";
import {
  PAYMENT_CLAIM_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  REQUEST_STATUS_LABELS,
  type CatalogTier,
  type ClientLevel,
  type PaymentClaimStatus,
  type PaymentMethod,
  type RequestStatus,
} from "@hogarplus/shared";

type RequestRow = {
  id: string;
  status: RequestStatus;
  createdAt: string;
  client: { id: string; code: string; firstName: string; lastName: string; phone: string; level: ClientLevel };
  product: { id: string; name: string; catalogTier: CatalogTier; price: number };
};

type ClaimRow = {
  id: string;
  status: PaymentClaimStatus;
  amount: number;
  method: PaymentMethod;
  receiptPath?: string | null;
  notes?: string | null;
  createdAt: string;
  client: { id: string; code: string; firstName: string; lastName: string; phone: string };
  credit: { id: string; code: string; product: { name: string; imageUrl?: string | null } };
  payment?: { id: string; code: string } | null;
};

export function RequestsPage() {
  const [tab, setTab] = useState<"products" | "payments">("payments");
  return (
    <div className="space-y-4">
      <PageHeader
        title="Solicitudes"
        description="Pedidos de catálogo y avisos de pago que mandan los clientes"
        icon={Inbox}
      />
      <div className="flex flex-wrap gap-2">
        <button className={tab === "payments" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("payments")}>
          Avisos de pago
        </button>
        <button className={tab === "products" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("products")}>
          Productos
        </button>
      </div>
      {tab === "payments" ? <PaymentClaimsTable /> : <ProductRequestsTable />}
    </div>
  );
}

function ProductRequestsTable() {
  const navigate = useNavigate();
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
    <>
      <DataTable
        title="Cola de productos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin solicitudes"
        emptyDescription="Cuando un cliente pida un producto, aparece aquí y te llega un aviso."
        headers={["Cliente", "Producto", "Estado", "Acciones"]}
        mobile={rows.map((row) => (
          <TableCard
            key={row.id}
            title={<Link to={`/clientes/${row.client.id}`}>{row.client.firstName} {row.client.lastName}</Link>}
            subtitle={row.client.code}
            initials={row.client.firstName}
            badge={<LevelBadge level={row.client.level} />}
            fields={[
              { label: "Producto", value: row.product.name, hint: money(row.product.price) },
              { label: "Estado", value: REQUEST_STATUS_LABELS[row.status] },
            ]}
            actions={
              row.status === "PENDING" ? (
                <RowActions
                  extra={[
                    { label: "Crear crédito", onClick: () => navigate(`/creditos/nuevo?clientId=${row.client.id}`) },
                    { label: "Aprobar", onClick: () => setConfirm({ row, status: "APPROVED" }) },
                    { label: "Rechazar", onClick: () => setConfirm({ row, status: "REJECTED" }), danger: true },
                  ]}
                />
              ) : (
                <Link className="font-semibold text-navy-800" to={`/creditos/nuevo?clientId=${row.client.id}`}>Ir a crédito</Link>
              )
            }
          />
        ))}
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
                <RowActions
                  extra={[
                    { label: "Crear crédito", onClick: () => navigate(`/creditos/nuevo?clientId=${row.client.id}`) },
                    { label: "Aprobar", onClick: () => setConfirm({ row, status: "APPROVED" }) },
                    { label: "Rechazar", onClick: () => setConfirm({ row, status: "REJECTED" }), danger: true },
                  ]}
                />
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
    </>
  );
}

function PaymentClaimsTable() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ row: ClaimRow; action: "approve" | "reject" } | null>(null);
  const q = useQuery({
    queryKey: ["payment-claims"],
    queryFn: () => api<ClaimRow[]>("/api/payment-claims?pageSize=50"),
  });
  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api(`/api/payment-claims/${id}/${action}`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (_res, vars) => {
      toast.success(vars.action === "approve" ? "Pago recibido y aplicado a las cuotas" : "Aviso rechazado");
      qc.invalidateQueries({ queryKey: ["payment-claims"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data?.data ?? [];

  return (
    <>
      <DataTable
        title="Avisos de pago del portal"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin avisos de pago"
        emptyDescription="Cuando un cliente avise efectivo o suba un comprobante, aparece aquí."
        headers={["Cliente", "Producto", "Monto", "Comprobante", "Estado", "Acciones"]}
        mobile={rows.map((row) => (
          <TableCard
            key={row.id}
            title={<Link to={`/clientes/${row.client.id}`}>{row.client.firstName} {row.client.lastName}</Link>}
            subtitle={row.client.phone}
            photo={row.credit.product.imageUrl ? mediaUrl(row.credit.product.imageUrl) : null}
            initials={row.client.firstName}
            fields={[
              { label: "Producto", value: row.credit.product.name, hint: `${row.credit.code} · ${formatDate(row.createdAt)}` },
              { label: "Monto", value: money(row.amount), hint: PAYMENT_METHOD_LABELS[row.method] },
              {
                label: "Comprobante",
                value: row.receiptPath ? (
                  <a className="font-semibold text-navy-800" href={mediaUrl(row.receiptPath)} target="_blank" rel="noreferrer">Ver foto</a>
                ) : "Sin foto",
              },
              { label: "Estado", value: PAYMENT_CLAIM_STATUS_LABELS[row.status] },
            ]}
            actions={
              row.status === "PENDING" ? (
                <RowActions
                  extra={[
                    { label: "Recibir pago", onClick: () => setConfirm({ row, action: "approve" }) },
                    { label: "Rechazar", onClick: () => setConfirm({ row, action: "reject" }), danger: true },
                  ]}
                />
              ) : row.payment ? (
                <Link className="font-semibold" to={`/pagos?creditId=${row.credit.id}&clientId=${row.client.id}`}>{row.payment.code}</Link>
              ) : undefined
            }
          />
        ))}
      >
        {rows.map((row) => (
          <tr key={row.id} className="border-t">
            <td className="px-5 py-3.5">
              <Link className="font-semibold" to={`/clientes/${row.client.id}`}>
                {row.client.firstName} {row.client.lastName}
              </Link>
              <div className="text-xs text-slate-500">{row.client.phone}</div>
            </td>
            <td className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                {row.credit.product.imageUrl ? (
                  <img src={mediaUrl(row.credit.product.imageUrl)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : null}
                <div>
                  <p className="font-semibold">{row.credit.product.name}</p>
                  <p className="text-xs text-slate-500">{row.credit.code} · {formatDate(row.createdAt)}</p>
                </div>
              </div>
            </td>
            <td className="px-5 py-3.5">
              {money(row.amount)}
              <div className="text-xs text-slate-500">{PAYMENT_METHOD_LABELS[row.method]}</div>
            </td>
            <td className="px-5 py-3.5">
              {row.receiptPath ? (
                <a className="font-semibold text-navy-800" href={mediaUrl(row.receiptPath)} target="_blank" rel="noreferrer">
                  Ver foto
                </a>
              ) : (
                <span className="text-xs text-slate-400">Sin foto</span>
              )}
            </td>
            <td className="px-5 py-3.5">{PAYMENT_CLAIM_STATUS_LABELS[row.status]}</td>
            <td className="px-5 py-3.5">
              {row.status === "PENDING" ? (
                <RowActions
                  extra={[
                    { label: "Recibir pago", onClick: () => setConfirm({ row, action: "approve" }) },
                    { label: "Rechazar", onClick: () => setConfirm({ row, action: "reject" }), danger: true },
                  ]}
                />
              ) : row.payment ? (
                <Link className="font-semibold" to={`/pagos?creditId=${row.credit.id}&clientId=${row.client.id}`}>{row.payment.code}</Link>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      {confirm && (
        <ConfirmModal
          title={confirm.action === "approve" ? "Recibir este pago" : "Rechazar aviso"}
          message={confirm.action === "approve" ? "Vas a cargar el pago de" : "Vas a rechazar el aviso de"}
          itemName={`${confirm.row.client.firstName} ${confirm.row.credit.product.name} · ${money(confirm.row.amount)}`}
          confirmText={confirm.action === "approve" ? "Recibir y aplicar" : "Rechazar"}
          loading={decide.isPending}
          error={decide.error instanceof Error ? decide.error.message : undefined}
          consequences={
            confirm.action === "approve"
              ? [
                  "Se registra el cobro como si lo hubiera cargado el equipo",
                  "Se aplica a las cuotas más antiguas",
                  "El saldo del crédito baja",
                ]
              : [
                  "No se carga ningún pago",
                  "El cliente puede volver a avisar",
                  "El historial queda como rechazado",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => decide.mutate({ id: confirm.row.id, action: confirm.action })}
        />
      )}
    </>
  );
}
