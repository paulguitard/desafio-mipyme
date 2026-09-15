"use client";

import { useMemo, useState } from "react";
import { BadgePostulacion } from "@/components/badges";
import { BotonAtras } from "@/components/boton-atras";
import { PreguntaCampo } from "@/components/pregunta-campo";
import type { RespuestasConvocatoria } from "@/lib/convocatoria-admin-data";
import { parseValor } from "@/lib/preguntas";

function textoPlano(valor: unknown) {
  if (Array.isArray(valor)) return valor.join(" ");
  if (valor == null) return "";
  return String(valor);
}

function contiene(haystack: string, needle: string) {
  const q = needle.trim().toLocaleLowerCase("es-CL");
  if (!q) return true;
  return haystack.toLocaleLowerCase("es-CL").includes(q);
}

export function ConvocatoriaRespuestas({ data }: { data: RespuestasConvocatoria }) {
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [preguntaId, setPreguntaId] = useState("");
  const [contieneTexto, setContieneTexto] = useState("");

  const enviadas = useMemo(
    () => data.postulaciones.filter((postulacion) => postulacion.enviadaAt),
    [data.postulaciones],
  );

  const fichas = useMemo(() => {
    return enviadas.filter((postulacion) => {
      if (!contiene(postulacion.emprendedorNombre, nombre)) return false;
      if (!contiene(postulacion.emprendedorEmail, correo)) return false;
      if (!preguntaId || !contieneTexto.trim()) return true;
      const respuesta = postulacion.respuestas.find((item) => item.preguntaId === preguntaId);
      return contiene(textoPlano(parseValor(respuesta?.valor ?? "")), contieneTexto);
    });
  }, [correo, contieneTexto, enviadas, nombre, preguntaId]);

  const ficha = fichas.find((item) => item.id === fichaId) ?? null;

  if (ficha) {
    return (
      <div className="respuestas-lista space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BotonAtras onClick={() => setFichaId(null)} />
              <p className="font-semibold">{ficha.emprendedorNombre}</p>
            </div>
            <p className="text-muted">{ficha.emprendedorEmail}</p>
            <p className="text-muted">
              Enviada: {new Date(ficha.enviadaAt ?? "").toLocaleString("es-CL")}
            </p>
          </div>
          <BadgePostulacion estado={ficha.estado} />
        </div>
        <div className="grid gap-3">
          {data.preguntas.map((pregunta) => {
            const respuesta = ficha.respuestas.find((item) => item.preguntaId === pregunta.id);
            return (
              <PreguntaCampo
                key={`${ficha.id}-${pregunta.id}`}
                pregunta={pregunta}
                respuesta={respuesta ?? null}
                disabled
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (enviadas.length === 0) {
    return (
      <p className="respuestas-lista text-muted">Aún no hay formularios respondidos en esta convocatoria.</p>
    );
  }

  return (
    <>
      <div className="respuestas-filtros">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="filtro-nombre">Nombre del emprendedor</label>
            <input
              className="input"
              id="filtro-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Buscar por nombre"
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-correo">Correo</label>
            <input
              className="input"
              id="filtro-correo"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder="Buscar por correo"
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-pregunta">Filtro por pregunta</label>
            <select
              className="input"
              id="filtro-pregunta"
              value={preguntaId}
              onChange={(event) => {
                setPreguntaId(event.target.value);
                if (!event.target.value) setContieneTexto("");
              }}
            >
              <option value="">Selecciona una pregunta</option>
              {data.preguntas.map((pregunta) => (
                <option key={pregunta.id} value={pregunta.id}>
                  {pregunta.enunciado}
                </option>
              ))}
            </select>
          </div>
          {preguntaId ? (
            <div className="field">
              <label htmlFor="filtro-contiene">Contiene</label>
              <input
                className="input"
                id="filtro-contiene"
                value={contieneTexto}
                onChange={(event) => setContieneTexto(event.target.value)}
                placeholder="Texto a buscar en la respuesta"
              />
            </div>
          ) : null}
        </div>
      </div>

      {fichas.length === 0 ? (
        <p className="respuestas-lista text-muted">Ninguna ficha coincide con los filtros.</p>
      ) : (
        <div className="respuestas-lista space-y-3">
          {fichas.map((postulacion) => (
            <button
              key={postulacion.id}
              type="button"
              className="card flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left"
              onClick={() => setFichaId(postulacion.id)}
            >
              <div className="min-w-0">
                <p className="font-semibold">{postulacion.emprendedorNombre}</p>
                <p className="text-muted">{postulacion.emprendedorEmail}</p>
                <p className="text-muted">
                  Enviada: {new Date(postulacion.enviadaAt ?? "").toLocaleString("es-CL")}
                </p>
              </div>
              <BadgePostulacion estado={postulacion.estado} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
