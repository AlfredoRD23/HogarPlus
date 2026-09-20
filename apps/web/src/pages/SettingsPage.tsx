import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Field } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";

type Settings = {
  affiliationFee: number;
  weeklyQuota: number;
  defaultWeeks: number;
  cashReservePercent: number;
  companyName: string;
  companyCity: string;
};

export function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/api/settings") });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (q.data?.data) setForm(q.data.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api("/api/settings", { method: "PUT", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return <p>Cargando...</p>;

  return (
    <div className="space-y-4">
      <PageHeader title="Reglas de negocio" description="Cuota, afiliación y reserva se leen y guardan en la base de datos" icon={Settings} />
      <div className="panel max-w-2xl p-6">
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Nombre"><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
        <Field label="Ubicación"><input className="input" value={form.companyCity} onChange={(e) => setForm({ ...form, companyCity: e.target.value })} /></Field>
        <Field label="Afiliación"><input className="input" type="number" value={form.affiliationFee} onChange={(e) => setForm({ ...form, affiliationFee: Number(e.target.value) })} /></Field>
        <Field label="Cuota semanal"><input className="input" type="number" value={form.weeklyQuota} onChange={(e) => setForm({ ...form, weeklyQuota: Number(e.target.value) })} /></Field>
        <Field label="Semanas"><input className="input" type="number" value={form.defaultWeeks} onChange={(e) => setForm({ ...form, defaultWeeks: Number(e.target.value) })} /></Field>
        <Field label="Reserva de caja %"><input className="input" type="number" value={form.cashReservePercent} onChange={(e) => setForm({ ...form, cashReservePercent: Number(e.target.value) })} /></Field>
        <div className="sm:col-span-2">
          <button className="btn-primary">Guardar</button>
        </div>
      </form>
      </div>
    </div>
  );
}
