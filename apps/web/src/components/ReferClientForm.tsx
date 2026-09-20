import { useState } from "react";
import { POINTS_RULES, firstError, personNameError, phoneError } from "@hogarplus/shared";
import { Field, FormattedInput, fieldHint } from "./Form";
import { WaitLabel } from "./Loader";

export function ReferClientForm({
  onSave,
  onCancel,
  loading = false,
  error,
}: {
  onSave: (body: { firstName: string; lastName: string; phone: string }) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const next = {
          firstName: personNameError(firstName, "nombre") ?? "",
          lastName: personNameError(lastName, "apellido") ?? "",
          phone: phoneError(phone) ?? "",
        };
        setErrors(next);
        if (firstError(Object.values(next))) return;
        onSave({ firstName: firstName.trim(), lastName: lastName.trim(), phone });
      }}
    >
      <p className="text-sm text-slate-600">
        Esto no es la referencia personal. Aquí das el nombre y teléfono de alguien para que el equipo lo entre al sistema.
        Si coinciden y queda creado, ganas {POINTS_RULES.REFERRAL} puntos.
      </p>
      <Field label="Nombre del referido" hint={fieldHint("name")} error={errors.firstName} required>
        <FormattedInput kind="name" required value={firstName} error={Boolean(errors.firstName)} onValue={setFirstName} />
      </Field>
      <Field label="Apellido del referido" hint={fieldHint("name")} error={errors.lastName} required>
        <FormattedInput kind="name" required value={lastName} error={Boolean(errors.lastName)} onValue={setLastName} />
      </Field>
      <Field label="Teléfono del referido" hint={fieldHint("phone")} error={errors.phone} required>
        <FormattedInput kind="phone" required value={phone} error={Boolean(errors.phone)} onValue={setPhone} />
      </Field>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" disabled={loading} onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={loading}>
          <WaitLabel waiting={loading} idle="Enviar referido" busy="Enviando..." />
        </button>
      </div>
    </form>
  );
}
