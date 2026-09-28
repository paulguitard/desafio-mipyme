"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  actualizarPerfilPropio,
  eliminarDocumentoFormalizacion,
  subirDocumentoFormalizacion,
} from "@/actions/perfil";
import { formatearRut, limpiarRut } from "@/lib/rut";
import { MAX_DOCUMENTOS_FORMALIZACION } from "@/lib/storage/limits";
import type { StoredFile } from "@/lib/preguntas";
import { publicUploadUrl } from "@/lib/preguntas";

export type DocumentoPerfil = StoredFile & { url?: string };

type PerfilParticipante = {
  rutPersonal: string | null;
  direccionPersonal: string | null;
  telefonoMovil: string | null;
  contactoWhatsapp: boolean;
  documentos: DocumentoPerfil[];
};

function InterruptorWhatsapp({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-navy">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={
          checked
            ? "Contacto por WhatsApp: sí"
            : "Contacto por WhatsApp: no"
        }
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-[3.5rem] shrink-0 items-center rounded-full border px-0.5 transition-colors ${
          checked ? "border-navy bg-navy" : "border-border bg-slate-100"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 flex w-[45%] items-center justify-center text-[10px] font-bold uppercase tracking-wide ${
            checked ? "left-0 text-white" : "right-0 text-muted"
          }`}
        >
          {checked ? "Sí" : "No"}
        </span>
        <span
          className={`relative z-10 inline-block size-5 rounded-full shadow transition-transform ${
            checked ? "translate-x-[1.65rem] bg-white" : "translate-x-0 bg-white"
          }`}
        />
      </button>
      <span className="min-w-0 flex-1 font-medium leading-snug text-navy">
        ¿Desea ser contactado por whatsapp para recibir más información del proceso?
      </span>
    </div>
  );
}

export function PerfilForm({
  name,
  email,
  participante,
}: {
  name: string;
  email: string;
  participante?: PerfilParticipante;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const esParticipante = Boolean(participante);
  const [pestana, setPestana] = useState<"datos" | "formalizacion">("datos");
  const [rutDisplay, setRutDisplay] = useState(() =>
    participante?.rutPersonal ? formatearRut(participante.rutPersonal) : "",
  );
  const [rutEditing, setRutEditing] = useState(false);
  const [whatsapp, setWhatsapp] = useState(participante?.contactoWhatsapp ?? false);
  const [documentos, setDocumentos] = useState<DocumentoPerfil[]>(
    () => participante?.documentos ?? [],
  );

  async function onSubmit(formData: FormData) {
    setSaving(true);
    setOk(false);
    setError(null);
    if (esParticipante) {
      formData.set("rutPersonal", limpiarRut(String(formData.get("rutPersonal") ?? "")));
      formData.set("contactoWhatsapp", whatsapp ? "true" : "false");
    }
    const result = await actualizarPerfilPropio(formData);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (esParticipante) {
      const limpio = limpiarRut(String(formData.get("rutPersonal") ?? ""));
      setRutDisplay(limpio ? formatearRut(limpio) : "");
      setRutEditing(false);
    }
    setOk(true);
    router.refresh();
  }

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setDocError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("documento", file);
    const result = await subirDocumentoFormalizacion(fd);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (result?.error) {
      setDocError(result.error);
      return;
    }
    if (result?.documentos) {
      setDocumentos(result.documentos);
    }
    router.refresh();
  }

  async function onRemove(id: string) {
    setDocError(null);
    setRemovingId(id);
    const result = await eliminarDocumentoFormalizacion(id);
    setRemovingId(null);
    if (result?.error) {
      setDocError(result.error);
      return;
    }
    if (result?.documentos) {
      setDocumentos(result.documentos);
    }
    router.refresh();
  }

  const pestanas = [
    { id: "datos" as const, label: "Datos personales" },
    { id: "formalizacion" as const, label: "Formalización Empresa" },
  ];

  return (
    <div className="grid gap-6">
      {esParticipante ? (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Secciones de Mi perfil"
        >
          {pestanas.map((item) => {
            const activa = pestana === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`perfil-tab-${item.id}`}
                aria-selected={activa}
                aria-controls={`perfil-panel-${item.id}`}
                tabIndex={activa ? 0 : -1}
                className={`btn btn-sm ${activa ? "btn-navy" : "btn-secondary"}`}
                onClick={() => setPestana(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <form
        className="card overflow-hidden"
        data-tour="perfil-datos"
        action={onSubmit}
        hidden={esParticipante && pestana !== "datos"}
        id="perfil-panel-datos"
        role={esParticipante ? "tabpanel" : undefined}
        aria-labelledby={esParticipante ? "perfil-tab-datos" : undefined}
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

          {esParticipante ? (
            <>
              <div className="field">
                <label htmlFor="perfil-rut">Rut Personal</label>
                <input
                  className="input"
                  id="perfil-rut"
                  name="rutPersonal"
                  value={rutDisplay}
                  autoComplete="off"
                  inputMode="text"
                  placeholder="12345678K"
                  maxLength={12}
                  onFocus={() => {
                    if (!rutEditing && rutDisplay) {
                      setRutDisplay(limpiarRut(rutDisplay));
                      setRutEditing(true);
                    }
                  }}
                  onChange={(event) => {
                    setRutEditing(true);
                    setRutDisplay(limpiarRut(event.target.value).slice(0, 9));
                  }}
                />
                <p className="text-sm text-muted">
                  Solo letras y números, sin puntos ni guiones. Al guardar se formatea como RUT
                  chileno.
                </p>
              </div>

              <div className="field">
                <label htmlFor="perfil-direccion">Dirección Personal</label>
                <input
                  className="input"
                  id="perfil-direccion"
                  name="direccionPersonal"
                  defaultValue={participante?.direccionPersonal ?? ""}
                  maxLength={200}
                  autoComplete="street-address"
                />
              </div>

              <div className="field md:col-span-2">
                <label htmlFor="perfil-telefono">Número de teléfono móvil</label>
                <input
                  className="input max-w-xs"
                  id="perfil-telefono"
                  name="telefonoMovil"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={9}
                  defaultValue={participante?.telefonoMovil ?? ""}
                  autoComplete="tel"
                  onChange={(event) => {
                    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 9);
                  }}
                />
                <div className="mt-3">
                  <InterruptorWhatsapp checked={whatsapp} onChange={setWhatsapp} />
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[var(--navy-soft)]/40 px-6 py-4">
          <div className="min-h-5 text-sm" aria-live="polite">
            {error ? <p className="font-semibold text-danger">{error}</p> : null}
            {ok && !error ? <p className="font-semibold text-navy">Cambios guardados.</p> : null}
          </div>
          <button
            className="btn btn-sm btn-primary"
            type="submit"
            disabled={saving}
            data-tour="perfil-guardar"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      {esParticipante ? (
        <section
          className="card overflow-hidden"
          hidden={pestana !== "formalizacion"}
          id="perfil-panel-formalizacion"
          role="tabpanel"
          aria-labelledby="perfil-tab-formalizacion"
        >
          <div className="border-b border-border px-6 py-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
              Formalización
            </p>
            <p className="mt-1 text-lg font-semibold text-navy">
              Formalización Empresa
            </p>
            <p className="mt-2 text-sm text-muted">
              Según las bases, para avanzar y postular al premio, tu empresa o emprendimiento debe
              estar formalizado.
            </p>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                id="perfil-documento"
                disabled={uploading || documentos.length >= MAX_DOCUMENTOS_FORMALIZACION}
                onChange={(event) => void onUpload(event.target.files)}
              />
              <label
                htmlFor="perfil-documento"
                className={`btn btn-sm btn-secondary ${
                  uploading || documentos.length >= MAX_DOCUMENTOS_FORMALIZACION
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }`}
              >
                {uploading ? "Subiendo…" : "Subir PDF"}
              </label>
              <p className="text-xs text-muted">PDF, máximo 5 MB. Hasta 5 archivos.</p>
            </div>

            {docError ? (
              <p className="text-sm font-semibold text-danger" aria-live="polite">
                {docError}
              </p>
            ) : null}

            {documentos.length === 0 ? (
              <p className="text-sm text-muted">Aún no has subido documentos.</p>
            ) : (
              <ul className="grid gap-2">
                {documentos.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[var(--navy-soft)]/30 px-3 py-2"
                  >
                    <a
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
                      href={publicUploadUrl(doc)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {doc.originalName}
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-danger"
                      disabled={removingId === doc.id}
                      onClick={() => void onRemove(doc.id)}
                    >
                      {removingId === doc.id ? "Quitando…" : "Quitar"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
