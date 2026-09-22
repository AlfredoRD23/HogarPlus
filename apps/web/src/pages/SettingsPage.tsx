import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Field, FormattedInput, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Loader, WaitLabel } from "../components/Loader";
import { EmailTemplatesPanel, type EmailTemplatePreview } from "../components/EmailTemplatesPanel";
import { Building2, Settings, Wallet } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useOnceSubmit } from "../hooks/useOnceSubmit";
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
  const templates = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => api<EmailTemplatePreview[]>("/api/settings/email-templates"),
  });
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
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = useOnceSubmit(save.isPending);

  if (!form) return <Loader label="Cargando reglas..." />;

  return (
    <div className="space-y-4">
      <PageHeader title="Reglas de negocio" description="Afiliación, cuota semanal y reserva de caja" icon={Settings} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
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
          submit.guard(() => save.mutate());
        }}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <RuleCard title="Empresa" description="Nombre y lugar que usa el sistema." icon={Building2}>
            <Field label="Nombre" hint={fieldHint("text")} error={errors.companyName} required>
              <FormattedInput kind="productName" required value={form.companyName} error={Boolean(errors.companyName)} onValue={(v) => setForm({ ...form, companyName: formatProductName(v) })} />
            </Field>
            <Field label="Ubicación" hint={fieldHint("city")} error={errors.companyCity} required>
              <FormattedInput kind="city" required value={form.companyCity} error={Boolean(errors.companyCity)} onValue={(v) => setForm({ ...form, companyCity: formatCity(v) })} />
            </Field>
          </RuleCard>
          <RuleCard title="Créditos" description="Se usa al entrar un cliente y al armar un crédito." icon={Wallet}>
            <Field label="Afiliación" hint={fieldHint("money")} error={errors.affiliationFee} required>
              <FormattedInput kind="money" required value={form.affiliationFee} error={Boolean(errors.affiliationFee)} onValue={(v) => setForm({ ...form, affiliationFee: v })} />
            </Field>
            <Field label="Cuota semanal" hint={fieldHint("money")} error={errors.weeklyQuota} required>
              <FormattedInput kind="money" required value={form.weeklyQuota} error={Boolean(errors.weeklyQuota)} onValue={(v) => setForm({ ...form, weeklyQuota: v })} />
            </Field>
            <Field label="Semanas" hint="Entre 1 y 104" error={errors.defaultWeeks} required>
              <FormattedInput kind="integer" required value={form.defaultWeeks} error={Boolean(errors.defaultWeeks)} onValue={(v) => setForm({ ...form, defaultWeeks: v })} />
            </Field>
          </RuleCard>
          <RuleCard title="Caja" description="Del cobro se aparta este porcentaje y no se trata como ganancia." icon={Settings}>
            <Field label="Reserva de caja %" hint={fieldHint("percent")} error={errors.cashReservePercent} required>
              <FormattedInput kind="percent" required value={form.cashReservePercent} error={Boolean(errors.cashReservePercent)} onValue={(v) => setForm({ ...form, cashReservePercent: v })} />
            </Field>
          </RuleCard>
        </div>
        <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Al guardar, estos números se usan en clientes, créditos, pagos y el dashboard.</p>
          <button className="btn-gold" disabled={submit.blocked}>
            <WaitLabel waiting={submit.blocked} idle="Guardar" busy="Guardando..." />
          </button>
        </div>
      </form>
      {templates.data?.data ? <EmailTemplatesPanel templates={templates.data.data} /> : null}
    </div>
  );
}

function RuleCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Settings;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid flex-1 gap-4">{children}</div>
    </section>
  );
}
