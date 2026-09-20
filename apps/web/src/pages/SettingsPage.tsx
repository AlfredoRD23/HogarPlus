import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { cityError, firstError, formatCity, formatProductName, integerError, moneyError, parseInteger, parseMoney, percentError, productNameError } from "@hogarplus/shared";

type Settings = {
  affiliationFee: number;
  weeklyQuota: number;
  defaultWeeks: number;
  cashReservePercent: number;
  companyName: string;
  companyCity: string;
};

type SettingsForm = {
  affiliationFee: string;
  weeklyQuota: string;
  defaultWeeks: string;
  cashReservePercent: string;
  companyName: string;
  companyCity: string;
};

export function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/api/settings") });
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (q.data?.data) {
      const data = q.data.data;
      setForm({
        companyName: data.companyName,
        companyCity: data.companyCity,
        affiliationFee: String(data.affiliationFee),
        weeklyQuota: String(data.weeklyQuota),
        defaultWeeks: String(data.defaultWeeks),
        cashReservePercent: String(data.cashReservePercent),
      });
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          companyName: form?.companyName.trim(),
          companyCity: form?.companyCity.trim(),
          affiliationFee: parseMoney(form?.affiliationFee ?? ""),
          weeklyQuota: parseMoney(form?.weeklyQuota ?? ""),
          defaultWeeks: parseInteger(form?.defaultWeeks ?? ""),
          cashReservePercent: parseMoney(form?.cashReservePercent ?? ""),
        }),
      }),
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return <p>Cargando...</p>;

  return (
    <div className="space-y-4">
      <PageHeader title="Reglas de negocio" description="Afiliación, cuota semanal y reserva de caja" icon={Settings} />
      <div className="panel max-w-2xl p-6">
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!form) return;
          const next = {
            companyName: productNameError(form.companyName) ? "El nombre debe tener al menos 2 caracteres" : "",
            companyCity: cityError(form.companyCity) ?? "",
            affiliationFee: moneyError(form.affiliationFee, { label: "monto de afiliación" }) ?? "",
            weeklyQuota: moneyError(form.weeklyQuota, { label: "cuota semanal" }) ?? "",
            defaultWeeks: integerError(form.defaultWeeks, { min: 1, max: 104, label: "cantidad de semanas" }) ?? "",
            cashReservePercent: percentError(form.cashReservePercent) ?? "",
          };
          setErrors(next);
          const message = firstError(Object.values(next));
          if (message) {
            toast.error(message);
            return;
          }
          save.mutate();
        }}
      >
        <Field label="Nombre" hint={fieldHint("text")} error={errors.companyName} required>
          <FormattedInput kind="productName" required value={form.companyName} error={Boolean(errors.companyName)} onValue={(v) => setForm({ ...form, companyName: formatProductName(v) })} />
        </Field>
        <Field label="Ubicación" hint={fieldHint("city")} error={errors.companyCity} required>
          <FormattedInput kind="city" required value={form.companyCity} error={Boolean(errors.companyCity)} onValue={(v) => setForm({ ...form, companyCity: formatCity(v) })} />
        </Field>
        <Field label="Afiliación" hint={fieldHint("money")} error={errors.affiliationFee} required>
          <FormattedInput kind="money" required value={form.affiliationFee} error={Boolean(errors.affiliationFee)} onValue={(v) => setForm({ ...form, affiliationFee: v })} />
        </Field>
        <Field label="Cuota semanal" hint={fieldHint("money")} error={errors.weeklyQuota} required>
          <FormattedInput kind="money" required value={form.weeklyQuota} error={Boolean(errors.weeklyQuota)} onValue={(v) => setForm({ ...form, weeklyQuota: v })} />
        </Field>
        <Field label="Semanas" hint="Entre 1 y 104" error={errors.defaultWeeks} required>
          <FormattedInput kind="integer" required value={form.defaultWeeks} error={Boolean(errors.defaultWeeks)} onValue={(v) => setForm({ ...form, defaultWeeks: v })} />
        </Field>
        <Field label="Reserva de caja %" hint={fieldHint("percent")} error={errors.cashReservePercent} required>
          <FormattedInput kind="percent" required value={form.cashReservePercent} error={Boolean(errors.cashReservePercent)} onValue={(v) => setForm({ ...form, cashReservePercent: v })} />
        </Field>
        <div className="sm:col-span-2">
          <button className="btn-primary">Guardar</button>
        </div>
      </form>
      </div>
    </div>
  );
}
