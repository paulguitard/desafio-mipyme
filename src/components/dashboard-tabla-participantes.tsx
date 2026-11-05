"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  estadosTdEnCeldas,
  pasaFiltroEstados,
  pasaFiltroTexto,
  type FilaDashboardParticipante,
} from "@/lib/perfiles-asesorias";

function marca(value: boolean) {
  return value ? "Sí" : "No";
}

function FiltroCampo({
  id,
  etiqueta,
  children,
}: {
  id: string;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold" htmlFor={id}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

const control =
  "w-full min-h-7 rounded-md border border-border bg-[var(--card)] px-2 py-0.5 text-xs font-normal text-foreground outline-none";

export function DashboardTablaParticipantes({ filas }: { filas: FilaDashboardParticipante[] }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [formalizacion, setFormalizacion] = useState("");
  const [asesoriaTd, setAsesoriaTd] = useState("");
  const [videoPitch, setVideoPitch] = useState("");

  const estadosTd = useMemo(
    () => estadosTdEnCeldas(filas.map((fila) => fila.asesoriaTd)),
    [filas],
  );

  const visibles = useMemo(
    () =>
      filas.filter((fila) => {
        if (!pasaFiltroTexto(fila.name, nombre)) return false;
        if (!pasaFiltroTexto(fila.email, correo)) return false;
        if (formalizacion === "si" && !fila.formalizacionEmpresa) return false;
        if (formalizacion === "no" && fila.formalizacionEmpresa) return false;
        if (!pasaFiltroEstados(fila.asesoriaTd, asesoriaTd ? [asesoriaTd] : [])) return false;
        if (videoPitch && fila.videoPitch !== videoPitch) return false;
        return true;
      }),
    [filas, nombre, correo, formalizacion, asesoriaTd, videoPitch],
  );

  return (
    <section className="card flex min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr className="border-b border-border">
              <th className="w-[24%] px-2.5 py-1.5 align-bottom">
                <FiltroCampo id="filtro-dash-nombre" etiqueta="Nombre">
                  <input
                    className={control}
                    id="filtro-dash-nombre"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Buscar"
                  />
                </FiltroCampo>
              </th>
              <th className="w-[28%] px-2.5 py-1.5 align-bottom">
                <FiltroCampo id="filtro-dash-correo" etiqueta="Correo">
                  <input
                    className={control}
                    id="filtro-dash-correo"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    placeholder="Buscar"
                  />
                </FiltroCampo>
              </th>
              <th className="w-[16%] px-2.5 py-1.5 align-bottom">
                <FiltroCampo id="filtro-dash-formalizacion" etiqueta="Formalización">
                  <select
                    className={control}
                    id="filtro-dash-formalizacion"
                    value={formalizacion}
                    onChange={(event) => setFormalizacion(event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </FiltroCampo>
              </th>
              <th className="w-[18%] px-2.5 py-1.5 align-bottom">
                <FiltroCampo id="filtro-dash-td" etiqueta="Asesoría TD">
                  <select
                    className={control}
                    id="filtro-dash-td"
                    value={asesoriaTd}
                    onChange={(event) => setAsesoriaTd(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {estadosTd.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </FiltroCampo>
              </th>
              <th className="w-[14%] px-2.5 py-1.5 align-bottom">
                <FiltroCampo id="filtro-dash-pitch" etiqueta="Video Pitch">
                  <select
                    className={control}
                    id="filtro-dash-pitch"
                    value={videoPitch}
                    onChange={(event) => setVideoPitch(event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </FiltroCampo>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={5}>
                  No hay participantes en este filtro.
                </td>
              </tr>
            ) : null}
            {visibles.map((fila) => (
              <tr key={fila.email} className="border-b border-border">
                <td className="break-words px-3 py-2">{fila.name}</td>
                <td className="break-all px-3 py-2">{fila.email}</td>
                <td className="px-3 py-2">{marca(fila.formalizacionEmpresa)}</td>
                <td className="px-3 py-2">{fila.asesoriaTd}</td>
                <td className="px-3 py-2">{fila.videoPitch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
