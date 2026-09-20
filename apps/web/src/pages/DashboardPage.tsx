import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bell, LayoutDashboard, Plus, Users, Wallet } from "lucide-react";
import { api, money } from "../lib/api";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { LEVEL_LABELS, type ClientLevel } from "@hogarplus/shared";

type Dashboard = {
  kpis: {
    activeClients: number;
    activeCredits: number;
    weeklyCollection: number;
    expectedWeekly: number;
    collectionRate: number;
    pendingPortfolio: number;
    overdueInstallments: number;
    merchandiseCost: number;
    grossMargin: number;
    stockValue: number;
    weeklyExpenses: number;
    availableCapitalHint: number;
  };
  levels: { level: ClientLevel; count: number }[];
  recentPayments: { id: string; code: string; amount: number; client: string; createdAt: string }[];
  lowStock: { sku: string; name: string; stock: number }[];
  setup: { hasClients: boolean; hasProducts: boolean; hasCredits: boolean; hasPayments: boolean };
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/dashboard"),
  });
  const d = data?.data;
  const setup = d?.setup;
  const pendingSetup = setup && (!setup.hasClients || !setup.hasProducts || !setup.hasCredits || !setup.hasPayments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen operativo de cartera, cobros e inventario"
        icon={LayoutDashboard}
        actions={[
          { label: "Nuevo cliente", icon: Users, onClick: () => navigate("/clientes") },
          { label: "Registrar pago", icon: Wallet, onClick: () => navigate("/pagos") },
          { label: "Cobranza", icon: Bell, variant: "ghost", onClick: () => navigate("/cobranza") },
        ]}
      />

      {pendingSetup && (
        <div className="panel p-5">
          <h2 className="font-display text-xl">Puesta en marcha</h2>
          <p className="mt-1 text-sm text-slate-500">Completa estos pasos para empezar a usar el panel.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Step done={setup.hasClients} label="Registrar clientes" onClick={() => navigate("/clientes")} />
            <Step done={setup.hasProducts} label="Cargar catálogo" onClick={() => navigate("/productos")} />
            <Step done={setup.hasCredits} label="Entregar un crédito" onClick={() => navigate("/creditos")} />
            <Step done={setup.hasPayments} label="Cobrar una cuota" onClick={() => navigate("/pagos")} />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="navy" label="Cobranza 7 días" value={isLoading ? "..." : money(d?.kpis.weeklyCollection ?? 0)} hint={`Esperado semanal ${money(d?.kpis.expectedWeekly ?? 0)}`} />
        <KpiCard tone="gold" label="Cartera pendiente" value={isLoading ? "..." : money(d?.kpis.pendingPortfolio ?? 0)} hint={`${d?.kpis.overdueInstallments ?? 0} cuotas vencidas`} />
        <KpiCard tone="white" label="Tasa de cobranza" value={`${d?.kpis.collectionRate ?? 0}%`} hint="Cobrado vs esperado de la cartera activa" />
        <KpiCard tone="white" label="Capital reinvertible (señal)" value={money(d?.kpis.availableCapitalHint ?? 0)} hint="Cobros menos gastos de la semana" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Clientes por nivel</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={(d?.levels ?? []).map((l) => ({ name: LEVEL_LABELS[l.level], count: l.count }))}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0B1F4A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-display text-xl">Separación económica</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span>Costo mercancía colocada</span><b>{money(d?.kpis.merchandiseCost ?? 0)}</b></li>
            <li className="flex justify-between"><span>Margen bruto teórico</span><b>{money(d?.kpis.grossMargin ?? 0)}</b></li>
            <li className="flex justify-between"><span>Inventario en almacén</span><b>{money(d?.kpis.stockValue ?? 0)}</b></li>
            <li className="flex justify-between"><span>Gastos 7 días</span><b>{money(d?.kpis.weeklyExpenses ?? 0)}</b></li>
          </ul>
          <p className="mt-4 rounded-xl bg-gold-50 p-3 text-xs text-navy-800">
            El cobro, el costo de mercancía y los gastos se muestran por separado.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="border-b px-5 py-4 font-display text-xl">Pagos recientes</div>
          {(d?.recentPayments ?? []).length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Todavía no hay cobros registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {(d?.recentPayments ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-5 py-3.5">{p.client}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.code}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel overflow-hidden">
          <div className="border-b px-5 py-4 font-display text-xl">Inventario bajo</div>
          {(d?.lowStock ?? []).length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Ningún producto está bajo el mínimo.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {(d?.lowStock ?? []).map((p) => (
                  <tr key={p.sku} className="border-t">
                    <td className="px-5 py-3.5">{p.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${done ? "bg-emerald-50 text-emerald-800" : "bg-slate-50"}`}
    >
      <span>{label}</span>
      <span className="text-xs font-bold">{done ? "Listo" : <Plus size={14} />}</span>
    </button>
  );
}
