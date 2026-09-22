"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarPerfilPropio } from "@/actions/perfil";

export function PerfilForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="card overflow-hidden"
      action={async (formData) => {
        setSaving(true);
        setOk(false);
        setError(null);
        const result = await actualizarPerfilPropio(formData);
        setSaving(false);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOk(true);
        router.refresh();
      }}
    >
      <div className="border-b border-border px-6 py-4">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">Cuenta</p>
        <p className="mt-1 text-lg font-semibold text-navy">Datos personales</p>
      </div>

      <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
        <div className="field">
          <label htmlFor="perfil-name">Nombre</label>
          <input
            key={name}
            className="input"
            id="perfil-name"
            name="name"
            defaultValue={name}
            required
            autoComplete="name"
          />
          <p className="text-sm text-muted">Así te verán en el panel y en tus postulaciones.</p>
        </div>

        <div className="field">
          <label htmlFor="perfil-email">Correo</label>
          <input
            className="input bg-[var(--navy-soft)] text-navy"
            id="perfil-email"
            type="email"
            value={email}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            aria-describedby="perfil-email-ayuda"
          />
          <p id="perfil-email-ayuda" className="text-sm text-muted">
            El correo no se puede modificar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[var(--navy-soft)]/40 px-6 py-4">
        <div className="min-h-5 text-sm" aria-live="polite">
          {error ? <p className="font-semibold text-danger">{error}</p> : null}
          {ok && !error ? <p className="font-semibold text-navy">Cambios guardados.</p> : null}
        </div>
        <button className="btn btn-sm btn-primary" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
