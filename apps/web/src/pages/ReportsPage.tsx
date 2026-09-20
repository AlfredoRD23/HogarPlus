import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, money, formatDate } from "../lib/api";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Loader } from "../components/Loader";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@hogarplus/shared";

type Finance = {
  salesPrice: number;
  merchandiseCost: number;
  grossMargin: number;
  collections: number;
  affiliationIncome: number;
  expenses: number;
  pendingPortfolio: number;
  theoreticalNet: number;
  weeklyExpected: number;
  note: string;
  weeklySeries: Array<{ week: string; amount: number }>;
  currentScale: { clients: number; merchandiseCapital: number; weeklyCollection: number };
  byMethod: Record<string, number>;
};

export function ReportsPage() {
  const q = useQuery({ queryKey: ["reports"], queryFn: () => api<Finance>("/api/reports/finance") });
  const d = q.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        description="Resumen de créditos, pagos y gastos"
        icon={BarChart3}
      />
      {q.isLoading ? <Loader label="Cargando reportes..." /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard tone="navy" label="Ventas a precio" value={q.isLoading ? "..." : money(d?.salesPrice ?? 0)} />
        <KpiCard tone="gold" label="Costo mercancía" value={money(d?.merchandiseCost ?? 0)} />
        <KpiCard label="Margen bruto teórico" value={money(d?.grossMargin ?? 0)} />
        <KpiCard label="Cobros (90 días)" value={money(d?.collections ?? 0)} />
      </div>
      <p className="rounded-2xl bg-navy-900 p-4 text-sm text-gold-100">{d?.note}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-display text-xl">Caja vs utilidad</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>Afiliaciones</span><b>{money(d?.affiliationIncome ?? 0)}</b></li>
            <li className="flex justify-between"><span>Gastos</span><b>{money(d?.expenses ?? 0)}</b></li>
            <li className="flex justify-between"><span>Cartera pendiente</span><b>{money(d?.pendingPortfolio ?? 0)}</b></li>
            <li className="flex justify-between"><span>Resultado teórico de caja</span><b>{money(d?.theoreticalNet ?? 0)}</b></li>
            <li className="flex justify-between"><span>Cobro semanal esperado</span><b>{money(d?.weeklyExpected ?? 0)}</b></li>
          </ul>
          {d?.currentScale && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Escala actual: {d.currentScale.clients} clientes activos · capital en mercancía colocada {money(d.currentScale.merchandiseCapital)} · cobro semanal esperado {money(d.currentScale.weeklyCollection)}.
            </p>
          )}
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-xl">Cobros por semana</h3>
          <div className="mt-4 h-64">
            {(d?.weeklySeries ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No hay cobros en la ventana.</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={(d?.weeklySeries ?? []).map((w) => ({ name: formatDate(w.week), amount: w.amount }))}>
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="amount" fill="#0B1F4A" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {Object.entries(d?.byMethod ?? {}).map(([method, amount]) => (
              <li key={method} className="flex justify-between">
                <span>{PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method}</span>
                <b>{money(amount)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
