import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, formatDate, money } from "../lib/api";
import { KpiCard } from "../components/KpiCard";
import { Field, FormattedTextarea, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Loader, WaitLabel } from "../components/Loader";
import { Bell } from "lucide-react";
import {
  firstError,
  formatPhoneRD,
  LEVEL_LABELS,
  noteError,
  slaDelayLabel,
  type ClientLevel,
} from "@hogarplus/shared";

type CollectionCard = {
  id: string;
  clientId: string;
  creditId: string;
  name: string;
  code: string;
  phone: string;
  city: string | null;
  level: ClientLevel;
  product: string;
  creditCode: string;
  amount: number;
  balance: number;
  dueDate: string | null;
  daysLate: number;
  overdueCount?: number;
  overdueTotal?: number;
  lastNote?: string | null;
};

type Board = {
  kpis: { expected: number; received: number; pending: number; rate: number; overdueCount: number };
  buckets: {
    onTime: CollectionCard[];
    dueToday: CollectionCard[];
    overdue: CollectionCard[];
    advanced: CollectionCard[];
  };
};

export function CollectionsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["collections"], queryFn: () => api<Board>("/api/collections") });
  const [noteFor, setNoteFor] = useState<{ clientId: string; creditId?: string; name: string } | null>(null);
  const addNote = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/collections/notes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Gestión registrada");
      setNoteFor(null);
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const d = q.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cobranza"
        description="SLA real: al día, pendiente hoy y atrasados por días o semanas"
        icon={Bell}
      />
      {q.isLoading ? (
        <Loader label="Cargando cobranza..." />
      ) : (
      <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="navy" label="Cobro esperado hoy" value={money(d?.kpis.expected ?? 0)} />
        <KpiCard tone="gold" label="Cobrado hoy" value={money(d?.kpis.received ?? 0)} />
        <KpiCard label="Pendiente hoy" value={money(d?.kpis.pending ?? 0)} />
        <KpiCard label="Cuotas atrasadas" value={`${d?.kpis.overdueCount ?? 0}`} hint={`${d?.kpis.rate ?? 0}% cobrado hoy`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bucket title="Al día" tone="ok" items={d?.buckets.onTime ?? []} onNote={setNoteFor} />
        <Bucket title="Pendiente hoy" tone="warn" items={d?.buckets.dueToday ?? []} onNote={setNoteFor} />
        <Bucket title="Atrasados" tone="bad" items={d?.buckets.overdue ?? []} onNote={setNoteFor} />
        <Bucket title="Adelantados" tone="ok" items={d?.buckets.advanced ?? []} onNote={setNoteFor} />
      </div>
      {noteFor && (
        <Modal title={`Gestión · ${noteFor.name}`} onClose={() => setNoteFor(null)}>
          <NoteForm
            saving={addNote.isPending}
            onCancel={() => setNoteFor(null)}
            onSave={(note, channel) => addNote.mutate({ clientId: noteFor.clientId, creditId: noteFor.creditId, note, channel })}
          />
        </Modal>
      )}
      </>
      )}
    </div>
  );
}

function Bucket({
  title,
  items,
  tone,
  onNote,
}: {
  title: string;
  items: CollectionCard[];
  tone: "ok" | "warn" | "bad";
  onNote: (v: { clientId: string; creditId?: string; name: string }) => void;
}) {
  const countClass =
    tone === "bad" ? "bg-rose-100 text-rose-800" : tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800";

  return (
    <div className="panel flex min-h-[280px] flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-xl">{title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${countClass}`}>{items.length}</span>
      </div>
      <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
        {items.map((item) => (
          <button
            key={item.id}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
            onClick={() => onNote({ clientId: item.clientId, creditId: item.creditId, name: item.name })}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.code} · {formatPhoneRD(item.phone)}
                  {item.city ? ` · ${item.city}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-navy-800">
                {LEVEL_LABELS[item.level]}
              </span>
            </div>
            <p className="mt-3 text-sm text-navy-800">{item.product}</p>
            <p className="mt-1 text-xs text-slate-500">{item.creditCode}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>Cuota {money(item.amount)}</span>
              <span>Saldo {money(item.balance)}</span>
              {item.dueDate && <span>Vence {formatDate(item.dueDate)}</span>}
            </div>
            {item.overdueCount && item.overdueCount > 1 && item.overdueTotal != null && (
              <p className="mt-2 text-xs font-semibold text-rose-700">
                {item.overdueCount} cuotas atrasadas · {money(item.overdueTotal)}
              </p>
            )}
            {item.daysLate > 0 && (
              <p className="mt-1 text-xs font-semibold text-rose-700">Atraso {slaDelayLabel(item.daysLate)}</p>
            )}
            {item.lastNote && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.lastNote}</p>}
          </button>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Sin cuentas en este estado</p>}
      </div>
    </div>
  );
}

function NoteForm({ onSave, onCancel, saving }: { onSave: (note: string, channel: string) => void; onCancel: () => void; saving?: boolean }) {
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState("WHATSAPP");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const message = firstError([noteError(note)]);
        if (message) {
          setError(message);
          toast.error(message);
          return;
        }
        onSave(note.trim(), channel);
      }}
    >
      <Field label="Canal" required>
        <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="CALL">Llamada</option>
          <option value="VISIT">Visita</option>
          <option value="SMS">SMS</option>
        </select>
      </Field>
      <Field label="Nota" hint="Mínimo 3 caracteres" error={error} required>
        <FormattedTextarea required value={note} error={Boolean(error)} onValue={(v) => { setNote(v); setError(""); }} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>
          <WaitLabel waiting={saving} idle="Guardar" busy="Guardando..." />
        </button>
      </div>
    </form>
  );
}
