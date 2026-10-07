"use client";

import { useEffect, useState } from "react";
import { SelectorVeredicto } from "@/components/selector-veredicto";
import { useReportarVeredictoSupervision } from "@/components/veredicto-supervision-context";
import {
  armarHiloRevision,
  type AsignacionHilo,
  type AudienciaHilo,
  type MensajeHilo,
  type RevisionHilo,
  type SupervisionHilo,
} from "@/lib/hilo-revision";
import type { NotaPreguntaGeneral, PeldanoEscala } from "@/lib/preguntas";
import { parseEscalaNotas } from "@/lib/preguntas";
import { revisionParaEditar, revisionVigente } from "@/lib/revision-ciclo";
import { irAPreguntaCaso } from "@/components/resumen-cambios-reenvio";
import { textoContinuo } from "@/lib/texto-continuo";

type PreguntaNotas = {
  id: string;
  enunciado: string;
  conNotas: boolean;
  escalaNotas: string;
};

type RevisionNota = {
  preguntaId: string;
  ronda: number;
  ciclo?: number;
  nota: number | null;
};

function etiquetaNota(nota: number | null, escala: PeldanoEscala[]) {
  if (nota == null || escala.length === 0) return null;
  const peldano = escala.find((item) => item.valor === nota);
  return peldano?.etiqueta ? `Nota: ${nota} · ${peldano.etiqueta}` : `Nota: ${nota}`;
}

function textoMensaje(mensaje: MensajeHilo) {
  if (mensaje.veredicto === "OBSERVACION") return textoContinuo(mensaje.comentario);
  if (mensaje.veredicto === "OK") return "Sin observaciones";
  return "";
}

function notasGeneralesDelCiclo(
  preguntas: PreguntaNotas[] | undefined,
  revisiones: RevisionNota[] | undefined,
  ronda: number,
  ciclo: number,
) {
  if (!preguntas || !revisiones) return [];
  return preguntas.flatMap((pregunta) => {
    if (!pregunta.conNotas) return [];
    const escala = parseEscalaNotas(pregunta.escalaNotas);
    const revision = revisiones.find(
      (item) =>
        item.preguntaId === pregunta.id &&
        item.ronda === ronda &&
        (item.ciclo ?? 1) === ciclo,
    );
    const texto = etiquetaNota(revision?.nota ?? null, escala);
    if (!texto) return [];
    return [{ enunciado: pregunta.enunciado, texto }];
  });
}

function SelectoresNotasGenerales({
  notas,
  canEdit,
  namePrefix,
}: {
  notas: NotaPreguntaGeneral[];
  canEdit: boolean;
  namePrefix: string;
}) {
  const [valores, setValores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(notas.map((item) => [item.preguntaId, item.notaInicial])),
  );

  if (notas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-navy">Notas</h4>
        <p className="text-sm text-muted">Calificación de las preguntas que se evalúan con nota.</p>
      </div>
      {notas.map((item) => {
        const nota = valores[item.preguntaId] ?? null;
        const campoNota = `${namePrefix}nota-${item.preguntaId}`;
        const campoVeredicto = `${namePrefix}veredicto-${item.preguntaId}`;
        return (
          <div key={item.preguntaId} className="space-y-2">
            <p className="text-sm font-semibold">{item.enunciado}</p>
            {canEdit ? (
              <>
                <input type="hidden" name={campoVeredicto} value="OK" />
                <input type="hidden" name={campoNota} value={nota ?? ""} />
                <div className="flex flex-wrap gap-2">
                  {item.escala.map((peldano) => {
                    const activo = nota === peldano.valor;
                    return (
                      <button
                        key={peldano.valor}
                        className={`btn btn-sm ${activo ? "btn-navy" : "btn-ghost"}`}
                        type="button"
                        onClick={() =>
                          setValores((actual) => ({ ...actual, [item.preguntaId]: peldano.valor }))
                        }
                      >
                        {peldano.valor}
                        {peldano.etiqueta ? ` · ${peldano.etiqueta}` : ""}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm">{etiquetaNota(nota, item.escala) ?? "Sin nota"}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EditorHilo({
  rol,
  namePrefix,
  preguntaId,
  veredictoInicial,
  comentarioInicial,
  notaInicial,
  escala,
  notasPreguntas,
}: {
  rol: "evaluador" | "supervisor";
  namePrefix: string;
  preguntaId?: string;
  veredictoInicial: string;
  comentarioInicial: string;
  notaInicial: number | null;
  escala: PeldanoEscala[];
  notasPreguntas: NotaPreguntaGeneral[];
}) {
  const [veredicto, setVeredicto] = useState(veredictoInicial);
  const [comentario, setComentario] = useState(comentarioInicial);
  const [nota, setNota] = useState<number | null>(notaInicial);
  const reportar = useReportarVeredictoSupervision();
  const sufijo = preguntaId ?? "general";
  const campoVeredicto = `${namePrefix}veredicto-${sufijo}`;
  const campoComentario = `${namePrefix}comentario-${sufijo}`;
  const campoNota = preguntaId ? `${namePrefix}nota-${preguntaId}` : "";
  const esSupervision = rol === "supervisor";
  const muestraNotasGenerales = !esSupervision && !preguntaId && notasPreguntas.length > 0;
  const muestraNota = escala.length > 0 && !esSupervision && Boolean(preguntaId);
  const muestraComentario = veredicto === "OBSERVACION";

  useEffect(() => {
    reportar(preguntaId ?? "general", veredicto);
  }, [preguntaId, reportar, veredicto]);

  return (
    <div className="hilo-editor-halo">
      <span className="hilo-editor-halo__glow" aria-hidden="true" />
      <span className="hilo-editor-halo__ring" aria-hidden="true" />
      <div className={`hilo-editor pregunta-edicion${muestraNotasGenerales || muestraNota || muestraComentario ? "" : " is-solo-cabeza"}`}>
      <div className="pregunta-edicion-enunciado hilo-editor-cabeza">
        <strong>
          {esSupervision
            ? "Tu supervisión, elige una de las opciones:"
            : "Tu evaluación, elige una de las opciones:"}
        </strong>
        <SelectorVeredicto campo={campoVeredicto} veredicto={veredicto} onChange={setVeredicto} />
      </div>
      <div className="pregunta-edicion-cuerpo space-y-3">
        <input type="hidden" name={campoVeredicto} value={veredicto} />
        {muestraNota ? <input type="hidden" name={campoNota} value={nota ?? ""} /> : null}
        {veredicto !== "OBSERVACION" ? (
          <input type="hidden" name={campoComentario} value={comentario} />
        ) : null}
        {muestraNotasGenerales ? (
          <SelectoresNotasGenerales notas={notasPreguntas} canEdit namePrefix={namePrefix} />
        ) : null}
        {muestraNota ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Nota</p>
            <div className="flex flex-wrap gap-2">
              {escala.map((peldano) => {
                const activo = nota === peldano.valor;
                return (
                  <button
                    key={peldano.valor}
                    className={`btn btn-sm ${activo ? "btn-navy" : "btn-ghost"}`}
                    type="button"
                    onClick={() => setNota(peldano.valor)}
                  >
                    {peldano.valor}
                    {peldano.etiqueta ? ` · ${peldano.etiqueta}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {muestraComentario ? (
          <div className="field">
            <label htmlFor={campoComentario}>Comentario (obligatorio)</label>
            <textarea
              className="input"
              id={campoComentario}
              name={campoComentario}
              value={comentario}
              onChange={(event) => {
                event.currentTarget.classList.remove("is-comentario-pendiente");
                setComentario(event.target.value);
              }}
            />
            <p className="veredicto-comentario-aviso text-danger" role="alert">
              Debes incluir un comentario.
            </p>
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}

function GloboHilo({
  mensaje,
  nombre,
  escala,
  notasGenerales,
}: {
  mensaje: MensajeHilo;
  nombre: string;
  escala: PeldanoEscala[];
  notasGenerales: { enunciado: string; texto: string }[];
}) {
  const texto = textoMensaje(mensaje);
  const notaTexto = mensaje.rol === "evaluador" ? etiquetaNota(mensaje.nota, escala) : null;
  const rol = mensaje.rol === "evaluador" ? "Evaluador" : "Supervisor";

  return (
    <li className={`hilo-globo is-${mensaje.rol}`}>
      <div className="hilo-globo-burbuja">
        <div className="hilo-globo-meta">
          <strong>{rol}</strong>
          {nombre ? <span>{nombre}</span> : null}
          {mensaje.esVersionFinal ? (
            <span className="hilo-ticker">Versión final mostrada al participante</span>
          ) : null}
        </div>
        {texto ? <p className="hilo-globo-texto">{texto}</p> : null}
        {notaTexto ? <p className="hilo-globo-nota">{notaTexto}</p> : null}
        {notasGenerales.length > 0 ? (
          <ul className="hilo-globo-notas">
            {notasGenerales.map((item) => (
              <li key={item.enunciado}>
                <span>{item.enunciado}</span>
                <span>{item.texto}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function PanelHiloRevision({
  audiencia,
  asignacion,
  revisiones,
  supervisiones = [],
  nombreEvaluador,
  nombreSupervisor = null,
  canEdit = false,
  rolEditor = null,
  preguntaId,
  escala = [],
  notasPreguntas = [],
  preguntasNotas,
  revisionesNotas,
  namePrefix = "",
  textoVacio = "Todavía no hay una evaluación visible.",
  respuestaModificada = false,
}: {
  audiencia: AudienciaHilo;
  asignacion: AsignacionHilo;
  revisiones: RevisionHilo[];
  supervisiones?: SupervisionHilo[];
  nombreEvaluador: string;
  nombreSupervisor?: string | null;
  canEdit?: boolean;
  rolEditor?: "evaluador" | "supervisor" | null;
  preguntaId?: string;
  escala?: PeldanoEscala[];
  notasPreguntas?: NotaPreguntaGeneral[];
  preguntasNotas?: PreguntaNotas[];
  revisionesNotas?: RevisionNota[];
  namePrefix?: string;
  textoVacio?: string;
  respuestaModificada?: boolean;
}) {
  const tarjetas = armarHiloRevision({
    revisiones,
    supervisiones,
    asignacion,
    audiencia,
  });
  const mostrarEditor = canEdit && rolEditor != null;
  const borradorEvaluacion = revisionParaEditar(
    revisiones,
    asignacion.rondaActual,
    asignacion.cicloSupervision,
  );
  const borradorSupervision = revisionVigente(
    supervisiones,
    asignacion.rondaActual,
    asignacion.cicloSupervision,
  );
  const notaInicial =
    rolEditor === "evaluador" && borradorEvaluacion ? (borradorEvaluacion.nota ?? null) : null;

  if (audiencia === "participante" && tarjetas.length === 0) {
    return (
      <div className="card space-y-2 p-4">
        <p className="text-muted">{textoVacio}</p>
      </div>
    );
  }

  const mostrarCambio = respuestaModificada && audiencia !== "participante";

  return (
    <div className={`hilo-revision${mostrarCambio ? " is-modificada" : ""}`}>
      {mostrarCambio && preguntaId ? (
        <button type="button" className="respuesta-modificada-pill" onClick={() => irAPreguntaCaso(preguntaId)}>
          Respuesta modificada
        </button>
      ) : null}
      {tarjetas.map((tarjeta) => {
        const editorAqui = mostrarEditor && tarjeta.ronda === asignacion.rondaActual;
        return (
          <article key={tarjeta.ronda} className="hilo-ronda">
            <h3 className="hilo-ronda-titulo">{tarjeta.titulo}</h3>
            {editorAqui && rolEditor ? (
              <EditorHilo
                rol={rolEditor}
                namePrefix={namePrefix}
                preguntaId={preguntaId}
                veredictoInicial={
                  (rolEditor === "supervisor" ? borradorSupervision : borradorEvaluacion)?.veredicto ?? ""
                }
                comentarioInicial={
                  (rolEditor === "supervisor" ? borradorSupervision : borradorEvaluacion)?.comentario ?? ""
                }
                notaInicial={notaInicial}
                escala={escala}
                notasPreguntas={notasPreguntas}
              />
            ) : null}
            {tarjeta.mensajes.length > 0 ? (
              audiencia === "participante" ? (
                <div className="hilo-textos-participante">
                  {tarjeta.mensajes.map((mensaje) => {
                    const texto = textoMensaje(mensaje);
                    if (!texto) return null;
                    return (
                      <p key={`${mensaje.rol}-${mensaje.id}`} className="hilo-texto-participante">
                        {texto}
                      </p>
                    );
                  })}
                </div>
              ) : (
              <ol className="hilo-globos">
                {tarjeta.mensajes.map((mensaje) => (
                  <GloboHilo
                    key={`${mensaje.rol}-${mensaje.id}`}
                    mensaje={mensaje}
                    nombre={mensaje.rol === "evaluador" ? nombreEvaluador : nombreSupervisor ?? ""}
                    escala={escala}
                    notasGenerales={
                      mensaje.rol === "evaluador" && !preguntaId
                        ? notasGeneralesDelCiclo(
                            preguntasNotas,
                            revisionesNotas,
                            mensaje.ronda,
                            mensaje.ciclo,
                          )
                        : []
                    }
                  />
                ))}
              </ol>
              )
            ) : editorAqui ? null : (
              <p className="hilo-ronda-vacio text-muted">Todavía no hay comentarios enviados.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
