"use client";

import { useMemo, useState } from "react";
import { formatearRut } from "@/lib/rut";
import { workbookXlsx } from "@/lib/xlsx-workbook";

export type PerfilParticipanteRow = {
  id: string;
  name: string;
  email: string;
  rutPersonal: string | null;
  direccionPersonal: string | null;
  telefonoMovil: string | null;
  contactoWhatsapp: boolean;
  formalizacionEmpresa: boolean;
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
      perfil.email,
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
    const blob = new Blob([bytes], {
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

      <div className="card min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-[var(--card)]">
            <tr className="border-b border-border">
              <th className="whitespace-nowrap px-5 py-3.5">Nombre</th>
              <th className="whitespace-nowrap px-5 py-3.5">Correo</th>
              <th className="whitespace-nowrap px-5 py-3.5">Rut personal</th>
              <th className="whitespace-nowrap px-5 py-3.5">Dirección personal</th>
              <th className="whitespace-nowrap px-5 py-3.5">Teléfono móvil</th>
              <th className="whitespace-nowrap px-5 py-3.5">WhatsApp</th>
              <th className="whitespace-nowrap px-5 py-3.5">Formalización empresa</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-muted" colSpan={7}>
                  No hay participantes en este filtro.
                </td>
              </tr>
            ) : null}
            {visibles.map((perfil) => (
              <tr key={perfil.id} className="border-b border-border">
                <td className="whitespace-nowrap px-5 py-3.5">{perfil.name}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{perfil.email}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{rutVisible(perfil.rutPersonal)}</td>
                <td className="px-5 py-3.5">{celda(perfil.direccionPersonal)}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{celda(perfil.telefonoMovil)}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{marca(perfil.contactoWhatsapp)}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{marca(perfil.formalizacionEmpresa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
