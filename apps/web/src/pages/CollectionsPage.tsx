import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, money } from "../lib/api";
import { KpiCard } from "../components/KpiCard";
import { Field, FormattedTextarea, Modal } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { Bell } from "lucide-react";
import { firstError, formatPhoneRD, noteError } from "@hogarplus/shared";

type Board = {
  kpis: { expected: number; received: number; pending: number; rate: number; overdueCount: number };
  buckets: {
    onTime: Array<{ id: string; client: { id: string; firstName: string; lastName: string; phone: string }; product: { name: string } }>;
    dueToday: Array<{ id: string; amount: number; credit: { id: string; client: { id: string; firstName: string; lastName: string; phone: string }; product: { name: string } } }>;
    overdue: Array<{ id: string; dueDate: string; amount: number; credit: { id: string; client: { id: string; firstName: string; lastName: string; phone: string }; product: { name: string } } }>;
    advanced: Array<{ id: string; client: { id: string; firstName: string; lastName: string; phone: string }; product: { name: string } }>;
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
        description="Al día, vence hoy, vencidos y adelantados"
        icon={Bell}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard tone="navy" label="Cobro esperado hoy" value={money(d?.kpis.expected ?? 0)} />
        <KpiCard tone="gold" label="Cobrado hoy" value={money(d?.kpis.received ?? 0)} />
        <KpiCard label="Pendiente" value={money(d?.kpis.pending ?? 0)} />
        <KpiCard label="% cobranza" value={`${d?.kpis.rate ?? 0}%`} hint={`${d?.kpis.overdueCount ?? 0} vencidos`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Bucket title="Al día" items={(d?.buckets.onTime ?? []).map((x) => ({ id: x.id, name: `${x.client.firstName} ${x.client.lastName}`, phone: x.client.phone, extra: x.product.name, clientId: x.client.id }))} onNote={setNoteFor} />
        <Bucket title="Vence hoy" items={(d?.buckets.dueToday ?? []).map((x) => ({ id: x.id, name: `${x.credit.client.firstName} ${x.credit.client.lastName}`, phone: x.credit.client.phone, extra: money(x.amount), clientId: x.credit.client.id, creditId: x.credit.id }))} onNote={setNoteFor} />
        <Bucket title="Vencidos" items={(d?.buckets.overdue ?? []).map((x) => ({ id: x.id, name: `${x.credit.client.firstName} ${x.credit.client.lastName}`, phone: x.credit.client.phone, extra: money(x.amount), clientId: x.credit.client.id, creditId: x.credit.id }))} onNote={setNoteFor} />
        <Bucket title="Adelantados" items={(d?.buckets.advanced ?? []).map((x) => ({ id: x.id, name: `${x.client.firstName} ${x.client.lastName}`, phone: x.client.phone, extra: x.product.name, clientId: x.client.id }))} onNote={setNoteFor} />
      </div>
      {noteFor && (
        <Modal title={`Gestión · ${noteFor.name}`} onClose={() => setNoteFor(null)}>
          <NoteForm
            onCancel={() => setNoteFor(null)}
            onSave={(note, channel) => addNote.mutate({ clientId: noteFor.clientId, creditId: noteFor.creditId, note, channel })}
          />
        </Modal>
      )}
    </div>
  );
}

function Bucket({
  title,
  items,
  onNote,
}: {
  title: string;
  items: Array<{ id: string; name: string; phone: string; extra: string; clientId: string; creditId?: string }>;
  onNote: (v: { clientId: string; creditId?: string; name: string }) => void;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg">{title}</h3>
        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            className="w-full rounded-xl bg-slate-50 p-3 text-left text-sm"
            onClick={() => onNote({ clientId: item.clientId, creditId: item.creditId, name: item.name })}
          >
            <p className="font-semibold">{item.name}</p>
            <p className="text-xs text-slate-500">{formatPhoneRD(item.phone)} · {item.extra}</p>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">Sin cuentas en este estado</p>}
      </div>
    </div>
  );
}

function NoteForm({ onSave, onCancel }: { onSave: (note: string, channel: string) => void; onCancel: () => void }) {
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
      <Field label="Canal">
        <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="CALL">Llamada</option>
          <option value="VISIT">Visita</option>
          <option value="SMS">SMS</option>
        </select>
      </Field>
      <Field label="Nota" hint="Mínimo 3 caracteres" error={error}>
        <FormattedTextarea required value={note} error={Boolean(error)} onValue={(v) => { setNote(v); setError(""); }} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
