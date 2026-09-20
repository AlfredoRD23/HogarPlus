import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { ConfirmModal } from "../components/ConfirmModal";
import { RowActions } from "../components/RowActions";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { TableCard } from "../components/TableCard";
import { WaitLabel } from "../components/Loader";
import { Plus, Shield } from "lucide-react";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, emailError, firstError, passwordError, personNameError, type Role } from "@hogarplus/shared";
import { useOnceSubmit } from "../hooks/useOnceSubmit";
import { StatusTabs } from "../components/StatusTabs";

type StaffUser = { id: string; name: string; email: string; role: Role; active: boolean };

export function UsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [confirm, setConfirm] = useState<{ user: StaffUser; activate: boolean } | null>(null);
  const [statusTab, setStatusTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => api<StaffUser[]>("/api/users"),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/api/users", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Usuario creado");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => {
      toast.success(confirm?.activate ? "Usuario reactivado" : "Usuario desactivado");
      qc.invalidateQueries({ queryKey: ["users"] });
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRows = q.data?.data ?? [];
  const activeRows = allRows.filter((u) => u.active);
  const inactiveRows = allRows.filter((u) => !u.active);
  const rows = statusTab === "ACTIVE" ? activeRows : inactiveRows;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuarios y roles"
        description="Crea cuentas para el equipo y asigna un rol"
        icon={Shield}
        actions={[{ label: "Nuevo usuario", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <StatusTabs
        value={statusTab}
        onChange={setStatusTab}
        activeCount={activeRows.length}
        inactiveCount={inactiveRows.length}
      />
      <DataTable
        title="Equipo"
        count={rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle={statusTab === "ACTIVE" ? "Sin usuarios activos" : "Sin usuarios inactivos"}
        emptyDescription={statusTab === "ACTIVE" ? "Crea un usuario operativo para ventas o cobranza." : "Los que desactives aparecen aquí."}
        headers={["Nombre", "Correo", "Rol", "Estado", "Acciones"]}
        mobile={rows.map((u) => (
          <TableCard
            key={u.id}
            title={u.name}
            subtitle={u.email}
            initials={u.name}
            muted={!u.active}
            badge={u.active ? null : <span className="text-[11px] font-bold uppercase text-rose-700">Inactivo</span>}
            fields={[
              { label: "Rol", value: ROLE_LABELS[u.role], hint: ROLE_DESCRIPTIONS[u.role] },
              { label: "Estado", value: u.active ? "Activo" : "Inactivo" },
            ]}
            actions={
              <RowActions
                active={u.active}
                onEdit={() => setEditing(u)}
                onDeactivate={() => setConfirm({ user: u, activate: false })}
                onActivate={() => setConfirm({ user: u, activate: true })}
              />
            }
          />
        ))}
      >
        {rows.map((u) => (
          <tr key={u.id} className={`border-t ${u.active ? "" : "opacity-60"}`}>
            <td className="px-5 py-3.5 font-semibold">{u.name}</td>
            <td className="px-5 py-3.5">{u.email}</td>
            <td className="px-5 py-3.5">
              <p>{ROLE_LABELS[u.role]}</p>
              <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[u.role]}</p>
            </td>
            <td className="px-5 py-3.5">{u.active ? "Activo" : "Inactivo"}</td>
            <td className="px-5 py-3.5">
              <RowActions
                active={u.active}
                onEdit={() => setEditing(u)}
                onDeactivate={() => setConfirm({ user: u, activate: false })}
                onActivate={() => setConfirm({ user: u, activate: true })}
              />
            </td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <Modal title="Nuevo usuario" onClose={() => setOpen(false)}>
          <UserForm saving={create.isPending} onCancel={() => setOpen(false)} onSave={(b) => create.mutate(b)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar usuario" onClose={() => setEditing(null)}>
          <UserForm saving={update.isPending} initial={editing} onCancel={() => setEditing(null)} onSave={(b) => update.mutate({ id: editing.id, body: b })} />
        </Modal>
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.activate ? "Reactivar usuario" : "Desactivar usuario"}
          message={confirm.activate ? "Vas a reactivar a" : "Vas a desactivar a"}
          itemName={confirm.user.name}
          confirmText={confirm.activate ? "Reactivar" : "Desactivar"}
          loading={toggle.isPending}
          error={toggle.error instanceof Error ? toggle.error.message : undefined}
          consequences={
            confirm.activate
              ? ["Podrá volver a entrar al panel"]
              : [
                  "No se borra: los créditos y pagos que registró se quedan",
                  "No podrá iniciar sesión",
                  "Debe quedar al menos un usuario de Dirección activo",
                  "Puedes reactivarlo cuando quieras",
                ]
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => toggle.mutate({ id: confirm.user.id, active: confirm.activate })}
        />
      )}
    </div>
  );
}

function UserForm({
  onSave,
  onCancel,
  initial,
  saving,
}: {
  onSave: (b: Record<string, unknown>) => void;
  onCancel: () => void;
  initial?: StaffUser;
  saving?: boolean;
}) {
  const editing = Boolean(initial);
  const [f, setF] = useState({ name: initial?.name ?? "", email: initial?.email ?? "", password: "", role: initial?.role ?? "VENTAS" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof f, value: string) => {
    setF((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const next = {
          name: personNameError(f.name, "nombre") ?? "",
          email: editing ? "" : emailError(f.email) ?? "",
          password: editing ? (f.password ? passwordError(f.password) ?? "" : "") : passwordError(f.password) ?? "",
        };
        setErrors(next);
        if (firstError(Object.values(next))) return;
        onSave({
          name: f.name.trim(),
          role: f.role,
          ...(editing ? (f.password ? { password: f.password } : {}) : { email: f.email.trim(), password: f.password }),
        });
      }}
    >
      <Field label="Nombre" hint={fieldHint("name")} error={errors.name} required>
        <FormattedInput kind="name" required value={f.name} error={Boolean(errors.name)} onValue={(v) => set("name", v)} />
      </Field>
      {!editing && (
        <Field label="Correo" hint={fieldHint("email")} error={errors.email} required>
          <FormattedInput kind="email" required value={f.email} error={Boolean(errors.email)} onValue={(v) => set("email", v)} />
        </Field>
      )}
      <Field label={editing ? "Nueva contraseña (opcional)" : "Contraseña"} hint={fieldHint("password")} error={errors.password} required={!editing}>
        <FormattedInput kind="password" required={!editing} value={f.password} error={Boolean(errors.password)} onValue={(v) => set("password", v)} />
      </Field>
      <Field label="Rol" hint={ROLE_DESCRIPTIONS[f.role as Role]} required>
        <select className="input" value={f.role} onChange={(e) => set("role", e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]} — {ROLE_DESCRIPTIONS[r]}</option>
          ))}
        </select>
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
