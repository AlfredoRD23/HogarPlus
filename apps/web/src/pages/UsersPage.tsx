import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Field, FormattedInput, Modal, fieldHint } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { Plus, Shield } from "lucide-react";
import { ROLE_LABELS, ROLES, emailError, firstError, passwordError, personNameError, type Role } from "@hogarplus/shared";

export function UsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => api<Array<{ id: string; name: string; email: string; role: Role; active: boolean }>>("/api/users"),
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

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuarios y roles"
        description="Crea cuentas para el equipo y asigna un rol"
        icon={Shield}
        actions={[{ label: "Nuevo usuario", icon: Plus, onClick: () => setOpen(true) }]}
      />
      <DataTable
        title="Equipo"
        count={q.data?.meta?.total ?? rows.length}
        loading={q.isLoading}
        rows={rows.length}
        emptyTitle="Sin usuarios"
        emptyDescription="Crea un usuario operativo para ventas o cobranza."
        headers={["Nombre", "Correo", "Rol", "Estado"]}
      >
        {rows.map((u) => (
          <tr key={u.id} className="border-t">
            <td className="px-4 py-3 font-semibold">{u.name}</td>
            <td className="px-4 py-3">{u.email}</td>
            <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
            <td className="px-4 py-3">{u.active ? "Activo" : "Inactivo"}</td>
          </tr>
        ))}
      </DataTable>
      {open && (
        <Modal title="Nuevo usuario" onClose={() => setOpen(false)}>
          <UserForm onCancel={() => setOpen(false)} onSave={(b) => create.mutate(b)} />
        </Modal>
      )}
    </div>
  );
}

function UserForm({ onSave, onCancel }: { onSave: (b: Record<string, unknown>) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "VENTAS" });
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
          email: emailError(f.email) ?? "",
          password: passwordError(f.password) ?? "",
        };
        setErrors(next);
        const message = firstError(Object.values(next));
        if (message) {
          toast.error(message);
          return;
        }
        onSave({ ...f, name: f.name.trim(), email: f.email.trim() });
      }}
    >
      <Field label="Nombre" hint={fieldHint("name")} error={errors.name}>
        <FormattedInput kind="name" required value={f.name} error={Boolean(errors.name)} onValue={(v) => set("name", v)} />
      </Field>
      <Field label="Correo" hint={fieldHint("email")} error={errors.email}>
        <FormattedInput kind="email" required value={f.email} error={Boolean(errors.email)} onValue={(v) => set("email", v)} />
      </Field>
      <Field label="Contraseña" hint={fieldHint("password")} error={errors.password}>
        <FormattedInput kind="password" required value={f.password} error={Boolean(errors.password)} onValue={(v) => set("password", v)} />
      </Field>
      <Field label="Rol">
        <select className="input" value={f.role} onChange={(e) => set("role", e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}
