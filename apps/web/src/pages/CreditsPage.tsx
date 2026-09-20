import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money } from "../lib/api";
import { CreditBadge, InstallmentBadge } from "../components/Badges";
import { Field } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import type { CreditStatus, InstallmentStatus } from "@hogarplus/shared";

type Credit = {
  id: string;
  code: string;
  status: CreditStatus;
  price: number;
  cost: number;
  balance: number;
  weeklyQuota: number;
  weeks: number;
  client: { firstName: string; lastName: string; code: string };
  product: { name: string };
};

export function CreditsPage() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["credits", search],
    queryFn: () => api<Credit[]>(`/api/credits?pageSize=50&search=${encodeURIComponent(search)}`),
  });
  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Créditos"
        description="Precio, saldo, cuota y costo se registran por separado"
        icon={FileText}
        searchPlaceholder="Buscar código, cliente o cédula"
        searchValue={search}
        onSearchChange={setSearch}
        actions={[{ label: "Nuevo crédito", icon: Plus, href: "/creditos/nuevo" }]}
      />
      <DataTable
        title="Cartera de créditos"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin créditos"
        emptyDescription="Entrega el primer producto a crédito para abrir cartera."
        emptyAction={<a className="btn-gold" href="/creditos/nuevo">Nuevo crédito</a>}
        headers={["Código", "Cliente", "Producto", "Precio", "Saldo", "Cuota", "Estado"]}
      >
        {rows.map((c) => (
          <tr key={c.id} className="border-t">
            <td className="px-4 py-3"><Link className="font-semibold" to={`/creditos/${c.id}`}>{c.code}</Link></td>
            <td className="px-4 py-3">{c.client.firstName} {c.client.lastName}</td>
            <td className="px-4 py-3">{c.product.name}</td>
            <td className="px-4 py-3">{money(c.price)}</td>
            <td className="px-4 py-3">{money(c.balance)}</td>
            <td className="px-4 py-3">{money(c.weeklyQuota)}</td>
            <td className="px-4 py-3"><CreditBadge status={c.status} /></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

export function NewCreditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => api<Array<{ id: string; firstName: string; lastName: string; affiliationPaid: boolean }>>("/api/clients?pageSize=100") });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api<Array<{ id: string; name: string; price: number; catalogTier: string }>>("/api/products?pageSize=100") });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ weeklyQuota: number; defaultWeeks: number }>("/api/settings"),
  });
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [productId, setProductId] = useState("");
  const [weeklyQuota, setWeeklyQuota] = useState(0);
  const [weeks, setWeeks] = useState(0);

  useEffect(() => {
    if (!settings.data) return;
    setWeeklyQuota((q) => (q === 0 ? settings.data.data.weeklyQuota : q));
    setWeeks((w) => (w === 0 ? settings.data.data.defaultWeeks : w));
  }, [settings.data]);

  const create = useMutation({
    mutationFn: () =>
      api("/api/credits", {
        method: "POST",
        body: JSON.stringify({ clientId, productId, weeklyQuota, weeks }),
      }),
    onSuccess: (res) => {
      toast.success("Crédito creado y mercancía descontada");
      const id = (res.data as { id: string }).id;
      navigate(`/creditos/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const product = (products.data?.data ?? []).find((p) => p.id === productId);

  return (
    <div className="panel max-w-2xl p-6">
      <PageHeader
        title="Nuevo crédito / entrega"
        description="Se descuenta inventario y se genera el calendario de cuotas"
        icon={FileText}
        actions={[{ label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") }]}
      />
      <form
        className="mt-4 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Cliente">
          <select className="input" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Seleccione</option>
            {(clients.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} {c.affiliationPaid ? "" : "(sin afiliación)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Producto">
          <select className="input" required value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Seleccione</option>
            {(products.data?.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name} · Cat {p.catalogTier} · {money(p.price)}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cuota semanal"><input className="input" type="number" value={weeklyQuota} onChange={(e) => setWeeklyQuota(Number(e.target.value))} /></Field>
          <Field label="Semanas"><input className="input" type="number" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></Field>
        </div>
        {product && (
          <p className="rounded-xl bg-gold-50 p-3 text-sm">
            Precio {money(product.price)} · Plan {money(weeklyQuota * weeks)} · El cobro no se contabiliza como ganancia.
          </p>
        )}
        <button className="btn-primary">Crear y entregar</button>
      </form>
    </div>
  );
}

export function CreditDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["credit", id],
    queryFn: () =>
      api<{
        code: string;
        price: number;
        cost: number;
        balance: number;
        weeklyQuota: number;
        status: CreditStatus;
        client: { firstName: string; lastName: string; id: string };
        product: { name: string };
        installments: Array<{ id: string; number: number; dueDate: string; amount: number; paidAmount: number; status: InstallmentStatus }>;
      }>(`/api/credits/${id}`),
  });
  const c = q.data?.data;
  if (!c) return <p>Cargando...</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={c.product.name}
        description={`${c.code} · ${c.client.firstName} ${c.client.lastName} · Precio ${money(c.price)} · Costo ${money(c.cost)}`}
        icon={FileText}
        actions={[
          { label: "Volver", icon: ArrowLeft, variant: "ghost", onClick: () => navigate("/creditos") },
          { label: "Registrar pago", href: `/pagos?creditId=${id}&clientId=${c.client.id}` },
        ]}
      />
      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <CreditBadge status={c.status} />
          <p className="font-display text-2xl">Saldo {money(c.balance)}</p>
        </div>
      </div>
      <div className="panel overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-900 text-xs uppercase text-gold-300">
            <tr>
              {["#", "Vence", "Cuota", "Pagado", "Estado"].map((h) => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.installments.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-3">{i.number}</td>
                <td className="px-4 py-3">{new Date(i.dueDate).toLocaleDateString("es-DO")}</td>
                <td className="px-4 py-3">{money(i.amount)}</td>
                <td className="px-4 py-3">{money(i.paidAmount)}</td>
                <td className="px-4 py-3"><InstallmentBadge status={i.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
