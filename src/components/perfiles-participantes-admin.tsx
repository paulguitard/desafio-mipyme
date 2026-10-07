"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { formatearRut } from "@/lib/rut";
import { workbookXlsx } from "@/lib/xlsx-workbook";
import { normalizarCorreo } from "@/lib/correo";

export type DocumentoFormalizacion = {
  id: string;
  originalName: string;
  mimeType: string;
  url: string;
};

export type PerfilParticipanteRow = {
  id: string;
  name: string;
  email: string;
  rutPersonal: string | null;
  direccionPersonal: string | null;
  telefonoMovil: string | null;
  contactoWhatsapp: boolean;
  formalizacionEmpresa: boolean;
  documentos: DocumentoFormalizacion[];
};

type FiltroBinario = { si: boolean; no: boolean };

const FILTRO_VACIO: FiltroBinario = { si: false, no: false };

function pasaFiltro(valor: boolean, filtro: FiltroBinario) {
  if (filtro.si === filtro.no) return true;
  return filtro.si ? valor : !valor;
}

function celda(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : "—";
}

function rutVisible(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? formatearRut(trimmed) : "—";
}

function marca(value: boolean) {
  return value ? "Sí" : "No";
}

function etiquetaDocumento(doc: DocumentoFormalizacion) {
  const nombre = doc.originalName.toLowerCase();
  if (doc.mimeType.includes("pdf") || nombre.endsWith(".pdf")) return "PDF";
  const ext = doc.originalName.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "DOC";
}

function filasExcel(filas: PerfilParticipanteRow[]) {
  return [
    [
      "Nombre",
      "Correo",
      "Rut personal",
      "Dirección personal",
      "Teléfono móvil",
      "WhatsApp",
      "Formalización empresa",
    ],
    ...filas.map((perfil) => [
      perfil.name,
      normalizarCorreo(perfil.email),
      rutVisible(perfil.rutPersonal) === "—" ? "" : rutVisible(perfil.rutPersonal),
      perfil.direccionPersonal?.trim() ?? "",
      perfil.telefonoMovil?.trim() ?? "",
      marca(perfil.contactoWhatsapp),
      marca(perfil.formalizacionEmpresa),
    ]),
  ];
}

function CheckGrupo({
  legend,
  filtro,
  conteoSi,
  conteoNo,
  onChange,
}: {
  legend: string;
  filtro: FiltroBinario;
  conteoSi: number;
  conteoNo: number;
  onChange: (siguiente: FiltroBinario) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-3 rounded-full border border-border bg-[var(--card)] px-4 py-1.5">
      <legend className="sr-only">{legend}</legend>
      <span className="text-sm font-semibold text-navy">{legend}</span>
      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={filtro.si}
          onChange={(event) => onChange({ ...filtro, si: event.target.checked })}
        />
        Sí ({conteoSi})
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={filtro.no}
          onChange={(event) => onChange({ ...filtro, no: event.target.checked })}
        />
        No ({conteoNo})
      </label>
    </fieldset>
  );
}

export function PerfilesParticipantesAdmin({ perfiles }: { perfiles: PerfilParticipanteRow[] }) {
  const [filtroWhatsapp, setFiltroWhatsapp] = useState<FiltroBinario>(FILTRO_VACIO);
  const [filtroFormalizacion, setFiltroFormalizacion] = useState<FiltroBinario>(FILTRO_VACIO);
  const [documentosDe, setDocumentosDe] = useState<PerfilParticipanteRow | null>(null);

  const visibles = useMemo(
    () =>
      perfiles.filter(
        (perfil) =>
          pasaFiltro(perfil.contactoWhatsapp, filtroWhatsapp) &&
          pasaFiltro(perfil.formalizacionEmpresa, filtroFormalizacion),
      ),
    [perfiles, filtroWhatsapp, filtroFormalizacion],
  );

  const whatsappSi = perfiles.filter((perfil) => perfil.contactoWhatsapp).length;
  const formalizacionSi = perfiles.filter((perfil) => perfil.formalizacionEmpresa).length;

  function descargarExcel() {
    const bytes = workbookXlsx("Perfiles", filasExcel(visibles));
    const blob = new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "perfiles-participantes.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CheckGrupo
              legend="WhatsApp"
              filtro={filtroWhatsapp}
              conteoSi={whatsappSi}
              conteoNo={perfiles.length - whatsappSi}
              onChange={setFiltroWhatsapp}
            />
            <CheckGrupo
              legend="Formalización"
              filtro={filtroFormalizacion}
              conteoSi={formalizacionSi}
              conteoNo={perfiles.length - formalizacionSi}
              onChange={setFiltroFormalizacion}
            />
          </div>
          <button className="btn btn-sm btn-secondary" type="button" onClick={descargarExcel}>
            Descarga excel
          </button>
        </div>
        <p className="text-sm text-muted">
          Mostrando {visibles.length} de {perfiles.length}. WhatsApp: {whatsappSi} de {perfiles.length}.
          Formalización empresa: {formalizacionSi} de {perfiles.length}.
        </p>
      </div>

      <div className="card min-h-0 overflow-auto overscroll-contain [scrollbar-gutter:stable]">
        <table className="w-full table-fixed text-left">
          <thead className="sticky top-0 z-10 bg-[var(--card)]">
            <tr className="border-b border-border">
              <th className="w-[14%] px-4 py-3.5">Nombre</th>
              <th className="w-[17%] px-4 py-3.5">Correo</th>
              <th className="w-[11%] px-4 py-3.5">Rut personal</th>
              <th className="w-[14%] px-4 py-3.5">Dirección personal</th>
              <th className="w-[11%] px-4 py-3.5">Teléfono móvil</th>
              <th className="w-[8%] px-4 py-3.5">WhatsApp</th>
              <th className="w-[10%] px-4 py-3.5">Formalización empresa</th>
              <th className="w-[15%] px-2 py-3.5">Documentos</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={8}>
                  No hay participantes en este filtro.
                </td>
              </tr>
            ) : null}
            {visibles.map((perfil) => (
              <tr key={perfil.id} className="border-b border-border">
                <td className="break-words px-4 py-3.5">{perfil.name}</td>
                <td className="break-all px-4 py-3.5">{normalizarCorreo(perfil.email)}</td>
                <td className="px-4 py-3.5">{rutVisible(perfil.rutPersonal)}</td>
                <td className="break-words px-4 py-3.5">{celda(perfil.direccionPersonal)}</td>
                <td className="px-4 py-3.5">{celda(perfil.telefonoMovil)}</td>
                <td className="px-4 py-3.5">{marca(perfil.contactoWhatsapp)}</td>
                <td className="px-4 py-3.5">{marca(perfil.formalizacionEmpresa)}</td>
                <td className="px-2 py-3.5">
                  <button
                    className="btn btn-sm btn-secondary whitespace-nowrap px-2.5"
                    type="button"
                    disabled={perfil.documentos.length === 0}
                    aria-label={`Ver documentos de ${perfil.name}`}
                    onClick={() => setDocumentosDe(perfil)}
                  >
                    Ver documentos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={documentosDe !== null}
        title={documentosDe ? `Documentos de ${documentosDe.name}` : "Documentos"}
        onClose={() => setDocumentosDe(null)}
        wide
      >
        {documentosDe && documentosDe.documentos.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
            {documentosDe.documentos.map((doc) => (
              <li key={doc.id}>
                <a
                  className="pregunta-adjuntos-doc"
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`Abrir ${doc.originalName}`}
                  aria-label={`Abrir ${doc.originalName}`}
                >
                  <span className="pregunta-adjuntos-doc-sheet" aria-hidden="true">
                    <span className="pregunta-adjuntos-doc-fold" />
                    <span className="pregunta-adjuntos-doc-badge">{etiquetaDocumento(doc)}</span>
                    <span className="pregunta-adjuntos-doc-lines">
                      <span />
                      <span />
                      <span />
                    </span>
                  </span>
                  <span className="pregunta-adjuntos-doc-name">{doc.originalName}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Este participante no tiene documentos de formalización.</p>
        )}
      </Modal>
    </div>
  );
}
