"use client";

import { useRef, useState } from "react";
import {
  actualizarPerfilPropio,
  eliminarDocumentoFormalizacion,
  subirDocumentoFormalizacion,
} from "@/actions/perfil";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { formatearRut, limpiarRut } from "@/lib/rut";
import { normalizarCorreo } from "@/lib/correo";
import { MAX_DOCUMENTOS_FORMALIZACION } from "@/lib/storage/limits";
import type { StoredFile } from "@/lib/preguntas";
import { publicUploadUrl } from "@/lib/preguntas";
import { errorDeResultado, useAccionOptimista, useDatoOptimista } from "@/lib/use-dato-optimista";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accion = useAccionOptimista();
  const docs = useDatoOptimista(participante?.documentos ?? []);
  const documentos = docs.dato;
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const esParticipante = Boolean(participante);
  const [pestana, setPestana] = useState<"datos" | "formalizacion">("datos");
  const [rutDisplay, setRutDisplay] = useState(() =>
    participante?.rutPersonal ? formatearRut(participante.rutPersonal) : "",
  );
  const [rutEditing, setRutEditing] = useState(false);
  const [whatsapp, setWhatsapp] = useState(participante?.contactoWhatsapp ?? false);

  function onSubmit(formData: FormData) {
    setOk(true);
    setError(null);
    if (esParticipante) {
      formData.set("rutPersonal", limpiarRut(String(formData.get("rutPersonal") ?? "")));
      formData.set("contactoWhatsapp", whatsapp ? "true" : "false");
      const limpio = limpiarRut(String(formData.get("rutPersonal") ?? ""));
      setRutDisplay(limpio ? formatearRut(limpio) : "");
      setRutEditing(false);
    }
    void accion.ejecutar(() => actualizarPerfilPropio(formData), {
      mensajeOk: "Cambios guardados.",
      onError: (mensaje) => {
        setOk(false);
        setError(mensaje);
      },
    });
  }

  function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setDocError(null);
    const tempId = `tmp-${crypto.randomUUID()}`;
    const fd = new FormData();
    fd.set("documento", file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    void docs
      .aplicar(
        (prev) => [
          ...prev,
          {
            id: tempId,
            originalName: file.name,
            relativePath: "",
            mimeType: file.type || "application/pdf",
            kind: "file",
          },
        ],
        () => subirDocumentoFormalizacion(fd),
        {
          reconciliar: (result, actual) => {
            if (!result || !("documentos" in result) || !result.documentos) return actual;
            return result.documentos;
          },
        },
      )
      .then((result) => {
        if (errorDeResultado(result)) setDocError(errorDeResultado(result));
      });
  }

  function onRemove(id: string) {
    setDocError(null);
    void docs
      .aplicar(
        (prev) => prev.filter((doc) => doc.id !== id),
        () => eliminarDocumentoFormalizacion(id),
        {
          reconciliar: (result, actual) => {
            if (!result || !("documentos" in result) || !result.documentos) return actual;
            return result.documentos;
          },
        },
      )
      .then((result) => {
        if (errorDeResultado(result)) setDocError(errorDeResultado(result));
      });
  }

  const pestanas = [
    { id: "datos" as const, label: "Datos personales" },
    { id: "formalizacion" as const, label: "Formalización Empresa" },
  ];

  return (
    <div className="perfil-form flex h-full min-h-0 flex-col gap-4">
      {esParticipante ? (
        <div
          className="flex shrink-0 flex-wrap gap-2"
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
        className={`card min-h-0 flex-1 flex-col overflow-hidden ${
          esParticipante && pestana !== "datos" ? "hidden" : "flex"
        }`}
        data-tour="perfil-datos"
        action={onSubmit}
        hidden={esParticipante && pestana !== "datos"}
        id="perfil-panel-datos"
        role={esParticipante ? "tabpanel" : undefined}
        aria-labelledby={esParticipante ? "perfil-tab-datos" : undefined}
      >
        <div className="shrink-0 border-b border-border px-6 py-4">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
            Datos personales
          </p>
        </div>

        <div className="page-scroll min-h-0 flex-1 overflow-y-auto grid gap-5 px-6 py-5 md:grid-cols-2">
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
            <p className="text-sm text-muted">Así te verán en el panel y en tus participaciones.</p>
          </div>

          <div className="field">
            <label htmlFor="perfil-email">Correo</label>
            <input
              className="input bg-[var(--navy-soft)] text-navy"
              id="perfil-email"
              type="email"
              value={normalizarCorreo(email)}
              readOnly
              autoCapitalize="none"
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

        <div className="perfil-guardar-bar flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-[var(--navy-soft)]/40 px-6 py-4">
          <div className="min-h-5 text-sm" aria-live="polite">
            {error ? <p className="font-semibold text-danger">{error}</p> : null}
            {ok && !error ? <p className="font-semibold text-navy">Cambios guardados.</p> : null}
            <IndicadorGuardando visible={accion.guardando} />
          </div>
          <button
            className="btn btn-sm btn-primary"
            type="submit"
            data-tour="perfil-guardar"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      {esParticipante ? (
        <section
          className={`card min-h-0 flex-1 flex-col overflow-hidden ${
            pestana !== "formalizacion" ? "hidden" : "flex"
          }`}
          hidden={pestana !== "formalizacion"}
          id="perfil-panel-formalizacion"
          role="tabpanel"
          aria-labelledby="perfil-tab-formalizacion"
        >
          <div className="shrink-0 border-b border-border px-6 py-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
              Formalización Empresa
            </p>
            <p className="mt-2 text-sm text-muted">
              Según las bases, para avanzar y postular al premio, tu empresa o emprendimiento debe
              estar formalizado.
            </p>
          </div>

          <div className="page-scroll min-h-0 flex-1 overflow-y-auto grid gap-4 px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                id="perfil-documento"
                disabled={documentos.length >= MAX_DOCUMENTOS_FORMALIZACION}
                onChange={(event) => void onUpload(event.target.files)}
              />
              <label
                htmlFor="perfil-documento"
                className={`btn btn-sm btn-secondary ${
                  documentos.length >= MAX_DOCUMENTOS_FORMALIZACION
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }`}
              >
                Subir PDF
              </label>
              <IndicadorGuardando visible={docs.guardando} />
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
                    {doc.relativePath ? (
                      <a
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
                        href={publicUploadUrl(doc)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.originalName}
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                        {doc.originalName}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-danger"
                      onClick={() => void onRemove(doc.id)}
                    >
                      Quitar
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
