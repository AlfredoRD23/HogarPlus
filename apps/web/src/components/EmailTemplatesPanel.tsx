import { useMemo, useState } from "react";
import { Mail } from "lucide-react";

export type EmailTemplatePreview = {
  id: string;
  name: string;
  description: string;
  audience: "cliente" | "equipo";
  subject: string;
  html: string;
};

export function EmailTemplatesPanel({ templates }: { templates: EmailTemplatePreview[] }) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? templates[0],
    [selectedId, templates],
  );

  if (!templates.length || !selected) {
    return (
      <section className="panel p-6">
        <p className="text-sm text-slate-500">Aún no hay plantillas de correo configuradas.</p>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-navy-800">
            <Mail size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Plantillas de correo</h2>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500">
              Listas para cuando configures el correo principal (SMTP). Mientras tanto se registran en el log del servidor.
            </p>
          </div>
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          Variables: <code className="text-navy-800">SMTP_HOST</code>, <code className="text-navy-800">SMTP_USER</code>,{" "}
          <code className="text-navy-800">SMTP_PASS</code>, <code className="text-navy-800">EMAIL_FROM</code>
        </p>
      </div>

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
          {templates.map((item) => {
            const active = item.id === selected.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`shrink-0 rounded-xl px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-navy-900/[0.06] text-navy-900 ring-1 ring-inset ring-gold-500/40"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className={`mt-0.5 block text-[11px] ${active ? "text-gold-600" : "text-slate-400"}`}>
                  {item.audience === "cliente" ? "Cliente" : "Equipo"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Asunto</p>
            <p className="mt-1 text-sm font-semibold text-navy-900">{selected.subject}</p>
            <p className="mt-2 text-sm text-slate-500">{selected.description}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#eef2f7]">
            <iframe
              title={`Vista previa · ${selected.name}`}
              srcDoc={selected.html}
              className="h-[520px] w-full bg-white"
              sandbox=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
