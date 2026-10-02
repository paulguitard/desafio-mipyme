"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  actualizarFormulario,
  actualizarPregunta,
  agregarPregunta,
  crearFormularioCompleto,
  eliminarPregunta,
  moverPregunta,
} from "@/actions/formularios";
import { BotonAtras } from "@/components/boton-atras";
import { CampoEditable } from "@/components/campo-editable";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { Modal } from "@/components/modal";
import { PreguntaCampo } from "@/components/pregunta-campo";
import {
  InterruptorObligatoria,
  PreguntaComposer,
  type PreguntaBorrador,
} from "@/components/pregunta-composer";
import {
  esPreguntaNombreCaso,
  ID_BORRADOR_NOMBRE_CASO,
  preguntaNombreCasoVista,
} from "@/lib/nombre-caso";
import {
  MODO_EVALUACION_BOTON,
  MODOS_EVALUACION,
  parseModoEvaluacion,
  type ModoEvaluacion,
} from "@/lib/modo-evaluacion";
import {
  campoLimiteCuenta,
  CUENTAS_PRESUPUESTO,
  esTipoFormato,
  parseConfigCorreo,
  parseConfigFecha,
  parseConfigGantt,
  parseConfigLimites,
  parseConfigObjetivos,
  parseConfigPresupuesto,
  parseEscalaNotas,
  parseOpciones,
  serializeConfigCorreo,
  serializeConfigFecha,
  serializeConfigGantt,
  serializeConfigObjetivos,
  serializeConfigPresupuesto,
  serializeEscalaNotas,
  serializeOpcionesConLimites,
  serializeSoloLimites,
  tipoTieneOpciones,
  validarEscalaNotas,
  type ConfigLimites,
  type TipoPregunta,
} from "@/lib/preguntas";
import { useAccionOptimista, useDatoOptimista } from "@/lib/use-dato-optimista";

function IconoSubir() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoBajar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoEditar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoEliminar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const btnIcono =
  "inline-flex size-8 items-center justify-center rounded-md text-navy transition-colors hover:bg-navy-soft disabled:pointer-events-none disabled:opacity-40";
const btnIconoDanger =
  "inline-flex size-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-navy-soft disabled:pointer-events-none disabled:opacity-40";

export type PreguntaVista = {
  id: string;
  enunciado: string;
  ayuda: string;
  tipo: string;
  opciones: string;
  obligatoria: boolean;
  permiteArchivo: boolean;
  permiteImagen: boolean;
  permiteVideoLink: boolean;
  conNotas: boolean;
  escalaNotas: string;
};

function limitesDe(borrador: PreguntaBorrador): ConfigLimites {
  return {
    minCaracteres: borrador.minCaracteres,
    maxCaracteres: borrador.maxCaracteres,
    minPalabras: borrador.minPalabras,
    maxPalabras: borrador.maxPalabras,
  };
}

function serializarOpcionesBorrador(borrador: PreguntaBorrador): string {
  const limites = limitesDe(borrador);
  if (borrador.tipo === "fecha") return serializeConfigFecha(borrador.fechaModo, limites);
  if (borrador.tipo === "correo") return serializeConfigCorreo(borrador.cantidadCorreos, limites);
  if (borrador.tipo === "gantt") return serializeConfigGantt(borrador.configGantt);
  if (borrador.tipo === "presupuesto") return serializeConfigPresupuesto(borrador.configPresupuesto);
  if (borrador.tipo === "objetivos_indicadores") return serializeConfigObjetivos(borrador.configObjetivos);
  if (tipoTieneOpciones(borrador.tipo)) return serializeOpcionesConLimites(borrador.opciones, limites);
  return serializeSoloLimites(limites);
}

function preguntaDesdeBorrador(id: string, borrador: PreguntaBorrador): PreguntaVista {
  return {
    id,
    enunciado: borrador.enunciado,
    ayuda: borrador.ayuda,
    tipo: borrador.tipo,
    opciones: serializarOpcionesBorrador(borrador),
    obligatoria: borrador.obligatoria,
    permiteArchivo: borrador.permiteArchivo,
    permiteImagen: borrador.permiteImagen,
    permiteVideoLink: borrador.permiteVideoLink,
    conNotas: borrador.conNotas,
    escalaNotas: serializeEscalaNotas(borrador.conNotas ? borrador.escalaNotas : []),
  };
}

function validarPregunta(borrador: PreguntaBorrador): string | null {
  if (!borrador.enunciado) return "Completa el enunciado y el tipo de pregunta.";
  if (tipoTieneOpciones(borrador.tipo) && borrador.opciones.length < 2) {
    return "Este tipo necesita al menos dos opciones (una por línea).";
  }
  if (borrador.tipo === "correo" && (borrador.cantidadCorreos < 1 || borrador.cantidadCorreos > 20)) {
    return "La cantidad de correos debe estar entre 1 y 20.";
  }
  if (borrador.conNotas) return validarEscalaNotas(borrador.escalaNotas);
  return null;
}

function formDataPregunta(formularioId: string, preguntaId: string | null, borrador: PreguntaBorrador) {
  const formData = new FormData();
  formData.set("formularioId", formularioId);
  if (preguntaId) formData.set("id", preguntaId);
  formData.set("enunciado", borrador.enunciado);
  formData.set("ayuda", borrador.ayuda);
  formData.set("tipo", borrador.tipo);
  if (borrador.tipo === "fecha") {
    formData.set("fechaModo", borrador.fechaModo);
    formData.set("opciones", "");
  } else if (borrador.tipo === "correo") {
    formData.set("cantidadCorreos", String(borrador.cantidadCorreos));
    formData.set("opciones", "");
  } else if (esTipoFormato(borrador.tipo)) {
    formData.set("opciones", "");
  } else {
    formData.set("opciones", borrador.opciones.join("\n"));
  }
  if (borrador.minCaracteres != null) formData.set("minCaracteres", String(borrador.minCaracteres));
  if (borrador.maxCaracteres != null) formData.set("maxCaracteres", String(borrador.maxCaracteres));
  if (borrador.minPalabras != null) formData.set("minPalabras", String(borrador.minPalabras));
  if (borrador.maxPalabras != null) formData.set("maxPalabras", String(borrador.maxPalabras));

  const g = borrador.configGantt;
  if (g.minActividades != null) formData.set("minActividades", String(g.minActividades));
  if (g.maxActividades != null) formData.set("maxActividades", String(g.maxActividades));
  if (g.fechaMin) formData.set("fechaMin", g.fechaMin);
  if (g.fechaMax) formData.set("fechaMax", g.fechaMax);
  if (g.maxDiasActividad != null) formData.set("maxDiasActividad", String(g.maxDiasActividad));

  const p = borrador.configPresupuesto;
  if (p.minItems != null) formData.set("minItems", String(p.minItems));
  if (p.maxItems != null) formData.set("maxItems", String(p.maxItems));
  for (const cuenta of CUENTAS_PRESUPUESTO) {
    const limites = p.limitesCuentas?.[cuenta.id];
    if (limites?.montoMin != null) {
      formData.set(campoLimiteCuenta(cuenta.id, "min"), String(limites.montoMin));
    }
    if (limites?.montoMax != null) {
      formData.set(campoLimiteCuenta(cuenta.id, "max"), String(limites.montoMax));
    }
  }
  if (p.montoTotalMin != null) formData.set("montoTotalMin", String(p.montoTotalMin));
  if (p.montoTotalMax != null) formData.set("montoTotalMax", String(p.montoTotalMax));

  const o = borrador.configObjetivos;
  formData.set("cantidadObjetivosEspecificos", String(o.cantidadObjetivosEspecificos));
  if (o.minIndicadoresPorObjetivo != null) {
    formData.set("minIndicadoresPorObjetivo", String(o.minIndicadoresPorObjetivo));
  }
  if (o.maxIndicadoresPorObjetivo != null) {
    formData.set("maxIndicadoresPorObjetivo", String(o.maxIndicadoresPorObjetivo));
  }

  if (borrador.obligatoria) formData.set("obligatoria", "on");
  if (borrador.permiteArchivo) formData.set("permiteArchivo", "on");
  if (borrador.permiteImagen) formData.set("permiteImagen", "on");
  if (borrador.permiteVideoLink) formData.set("permiteVideoLink", "on");
  if (borrador.conNotas) formData.set("conNotas", "on");
  formData.set("escalaNotas", serializeEscalaNotas(borrador.conNotas ? borrador.escalaNotas : []));
  return formData;
}

export function FormularioBuilder({
  modo,
  formulario,
  permitirEvaluacionPorPregunta,
}: {
  modo: "nuevo" | "existente";
  formulario?: {
    id: string;
    titulo: string;
    modoEvaluacion?: string;
    puedeCambiarModo?: boolean;
    preguntas: PreguntaVista[];
  };
  permitirEvaluacionPorPregunta: boolean;
}) {
  const accion = useAccionOptimista();
  const preguntasIniciales = useMemo(() => {
    const actuales = formulario?.preguntas ?? [];
    if (actuales.some(esPreguntaNombreCaso)) return actuales;
    return [preguntaNombreCasoVista(ID_BORRADOR_NOMBRE_CASO), ...actuales];
  }, [formulario?.preguntas]);
  const preguntasState = useDatoOptimista(preguntasIniciales);
  const preguntas = preguntasState.dato;
  const [titulo, setTitulo] = useState(formulario?.titulo ?? "");
  const [modoEvaluacion, setModoEvaluacion] = useState<ModoEvaluacion>(() => {
    if (formulario?.modoEvaluacion) return parseModoEvaluacion(formulario.modoEvaluacion);
    return permitirEvaluacionPorPregunta ? "POR_PREGUNTA" : "GENERAL";
  });
  const [tituloDraft, setTituloDraft] = useState(formulario?.titulo ?? "");
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const tituloInputRef = useRef<HTMLInputElement>(null);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [obligatoria, setObligatoria] = useState(true);
  const error = preguntasState.error ?? accion.error;
  const setError = (valor: string | null) => {
    preguntasState.setError(valor);
    accion.setError(valor);
  };

  const esNuevo = modo === "nuevo";
  const puedeCambiarModo = esNuevo || Boolean(formulario?.puedeCambiarModo);

  useEffect(() => {
    if (esNuevo || !formulario?.titulo) setEditandoTitulo(true);
  }, [esNuevo, formulario?.titulo]);

  useEffect(() => {
    if (editandoTitulo) tituloInputRef.current?.focus();
  }, [editandoTitulo]);

  const preguntaEditando = editandoId ? preguntas.find((item) => item.id === editandoId) : undefined;
  const modalPreguntaAbierto = agregando || Boolean(preguntaEditando);

  function cerrarModalPregunta() {
    setAgregando(false);
    setEditandoId(null);
    setObligatoria(true);
    setError(null);
  }

  function persistirTitulo(
    siguienteTitulo: string,
    siguienteModo: ModoEvaluacion = modoEvaluacion,
  ) {
    if (esNuevo || !formulario) return;
    const tituloFinal = siguienteTitulo.trim();
    if (!tituloFinal) {
      setError("El título es obligatorio.");
      return;
    }
    const formData = new FormData();
    formData.set("id", formulario.id);
    formData.set("titulo", tituloFinal);
    formData.set("modoEvaluacion", siguienteModo);
    void accion.ejecutar(() => actualizarFormulario(formData));
  }

  function guardarTitulo() {
    const siguiente = tituloDraft.trim();
    if (!siguiente) {
      setError("El título es obligatorio.");
      return;
    }
    setTitulo(siguiente);
    setTituloDraft(siguiente);
    setEditandoTitulo(false);
    persistirTitulo(siguiente);
  }

  function onCambiarModo(siguiente: ModoEvaluacion) {
    if (!puedeCambiarModo || siguiente === modoEvaluacion) return;
    if (
      siguiente === "POR_PREGUNTA" &&
      !permitirEvaluacionPorPregunta &&
      modoEvaluacion !== "POR_PREGUNTA"
    ) {
      return;
    }
    setModoEvaluacion(siguiente);
    if (esNuevo) return;
    persistirTitulo(titulo, siguiente);
  }

  function onAgregar(borrador: PreguntaBorrador) {
    const mensaje = validarPregunta(borrador);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError(null);
    const tempId = crypto.randomUUID();
    setAgregando(false);
    if (esNuevo) {
      void preguntasState.aplicar(
        (actual) => [...actual, preguntaDesdeBorrador(tempId, borrador)],
        async () => ({ ok: true }),
      );
      return;
    }
    void preguntasState.aplicar(
      (actual) => [...actual, preguntaDesdeBorrador(tempId, borrador)],
      () => agregarPregunta(formDataPregunta(formulario!.id, null, borrador)),
      {
        reconciliar: (result, actual) => {
          const id = result && "id" in result && typeof result.id === "string" ? result.id : null;
          if (!id) return actual;
          return actual.map((item) => (item.id === tempId ? { ...item, id } : item));
        },
      },
    );
  }

  function onGuardarEdicion(borrador: PreguntaBorrador) {
    if (!editandoId) return;
    const actual = preguntas.find((item) => item.id === editandoId);
    if (actual && esPreguntaNombreCaso(actual)) {
      setError("El nombre del caso es una pregunta fija y no se puede editar.");
      return;
    }
    const mensaje = validarPregunta(borrador);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    const id = editandoId;
    const actualizada = preguntaDesdeBorrador(id, borrador);
    setEditandoId(null);
    setError(null);
    if (esNuevo) {
      void preguntasState.aplicar(
        (lista) => lista.map((item) => (item.id === id ? actualizada : item)),
        async () => ({ ok: true }),
      );
      return;
    }
    void preguntasState.aplicar(
      (lista) => lista.map((item) => (item.id === id ? actualizada : item)),
      () => actualizarPregunta(formDataPregunta(formulario!.id, id, borrador)),
    );
  }

  function onEliminar(id: string) {
    const actual = preguntas.find((item) => item.id === id);
    if (actual && esPreguntaNombreCaso(actual)) {
      setError("El nombre del caso es una pregunta fija y no se puede eliminar.");
      return;
    }
    if (esNuevo) {
      void preguntasState.aplicar(
        (lista) => lista.filter((item) => item.id !== id),
        async () => ({ ok: true }),
      );
      return;
    }
    const formData = new FormData();
    formData.set("id", id);
    formData.set("formularioId", formulario!.id);
    void preguntasState.aplicar(
      (lista) => lista.filter((item) => item.id !== id),
      () => eliminarPregunta(formData),
    );
  }

  function onMover(id: string, direccion: "up" | "down") {
    const index = preguntas.findIndex((item) => item.id === id);
    const swapWith = direccion === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= preguntas.length) return;
    if (esPreguntaNombreCaso(preguntas[index]) || esPreguntaNombreCaso(preguntas[swapWith])) return;
    if (esNuevo) {
      void preguntasState.aplicar((lista) => {
        const reordenadas = [...lista];
        const i = reordenadas.findIndex((item) => item.id === id);
        const j = direccion === "up" ? i - 1 : i + 1;
        [reordenadas[i], reordenadas[j]] = [reordenadas[j], reordenadas[i]];
        return reordenadas;
      }, async () => ({ ok: true }));
      return;
    }
    const formData = new FormData();
    formData.set("id", id);
    formData.set("formularioId", formulario!.id);
    formData.set("direccion", direccion);
    void preguntasState.aplicar((lista) => {
      const reordenadas = [...lista];
      const i = reordenadas.findIndex((item) => item.id === id);
      const j = direccion === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= reordenadas.length) return lista;
      [reordenadas[i], reordenadas[j]] = [reordenadas[j], reordenadas[i]];
      return reordenadas;
    }, () => moverPregunta(formData));
  }

  function onGuardarNuevo() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    void accion.ejecutar(() =>
      crearFormularioCompleto({
        titulo: titulo.trim(),
        tipo: "FEEDBACK",
        modoEvaluacion,
        preguntas: preguntas.map((pregunta) => ({
          enunciado: pregunta.enunciado,
          ayuda: pregunta.ayuda,
          tipo: pregunta.tipo as TipoPregunta,
          opciones: pregunta.opciones,
          obligatoria: pregunta.obligatoria,
          permiteArchivo: pregunta.permiteArchivo,
          permiteImagen: pregunta.permiteImagen,
          permiteVideoLink: pregunta.permiteVideoLink,
          conNotas: pregunta.conNotas,
          escalaNotas: parseEscalaNotas(pregunta.escalaNotas),
        })),
      }),
    );
  }

  return (
    <div className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BotonAtras href="/admin/formularios" />
            <div className="min-w-0 flex-1" data-tour="formulario-titulo">
              <CampoEditable
                editing={editandoTitulo}
                onEditar={() => {
                  setTituloDraft(titulo);
                  setEditandoTitulo(true);
                }}
                onCancelar={() => {
                  setTituloDraft(titulo);
                  setEditandoTitulo(false);
                  setError(null);
                }}
                onGuardar={guardarTitulo}
                lectura={
                  <h1 className="inline text-3xl font-extrabold text-navy">{titulo || "Título del formulario"}</h1>
                }
                edicion={
                  <div className="field">
                    <label htmlFor="titulo-formulario">Título</label>
                    <input
                      ref={tituloInputRef}
                      id="titulo-formulario"
                      className="input w-full"
                      value={tituloDraft}
                      placeholder="Título del formulario"
                      onChange={(event) => setTituloDraft(event.target.value)}
                    />
                  </div>
                }
              />
            </div>
          </div>
          {esNuevo ? (
            <button
              className="btn btn-sm btn-primary shrink-0"
              type="button"
              onClick={onGuardarNuevo}
              data-tour="formulario-guardar"
            >
              Guardar formulario
            </button>
          ) : null}
        </div>
        {error ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={preguntasState.guardando || accion.guardando} />
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="text-sm font-semibold text-navy">Tipo de evaluación</p>
            {MODOS_EVALUACION.map((modoItem) => {
              const activo = modoEvaluacion === modoItem;
              const bloquearPorPregunta =
                modoItem === "POR_PREGUNTA" &&
                !permitirEvaluacionPorPregunta &&
                modoEvaluacion !== "POR_PREGUNTA";
              return (
                <button
                  key={modoItem}
                  className={`btn btn-sm ${activo ? "btn-primary" : "btn-secondary"}`}
                  type="button"
                  disabled={!puedeCambiarModo || bloquearPorPregunta}
                  onClick={() => onCambiarModo(modoItem)}
                >
                  {MODO_EVALUACION_BOTON[modoItem]}
                </button>
              );
            })}
          </div>
          {!puedeCambiarModo ? (
            <p className="text-right text-sm text-muted">
              El tipo queda fijo porque este formulario ya tiene asesorías asociadas.
            </p>
          ) : !permitirEvaluacionPorPregunta && modoEvaluacion !== "POR_PREGUNTA" ? (
            <p className="text-right text-sm text-muted">
              El tipo pregunta por pregunta está desactivado. Puedes habilitarlo en
              Configuración (engranaje).
            </p>
          ) : null}
        </div>
      </div>

      <div className="page-scroll min-h-0 overflow-y-auto overscroll-contain space-y-8 pr-1">
          {preguntas.map((pregunta, index) => {
            const esFija = esPreguntaNombreCaso(pregunta);
            return (
              <PreguntaCampo
                key={pregunta.id}
                pregunta={pregunta}
                preview
                acciones={
                  esFija ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Fija</span>
                  ) : (
                  <>
                    <button
                      className={btnIcono}
                      type="button"
                      aria-label="Subir"
                      title="Subir"
                      onClick={() => onMover(pregunta.id, "up")}
                      disabled={index <= 1}
                    >
                      <IconoSubir />
                    </button>
                    <button
                      className={btnIcono}
                      type="button"
                      aria-label="Bajar"
                      title="Bajar"
                      onClick={() => onMover(pregunta.id, "down")}
                      disabled={index === preguntas.length - 1}
                    >
                      <IconoBajar />
                    </button>
                    <button
                      className={btnIcono}
                      type="button"
                      aria-label="Editar"
                      title="Editar"
                      onClick={() => {
                        setAgregando(false);
                        setError(null);
                        setObligatoria(pregunta.obligatoria);
                        setEditandoId(pregunta.id);
                      }}
                    >
                      <IconoEditar />
                    </button>
                    <button
                      className={btnIconoDanger}
                      type="button"
                      aria-label="Eliminar"
                      title="Eliminar"
                      onClick={() => onEliminar(pregunta.id)}
                    >
                      <IconoEliminar />
                    </button>
                  </>
                  )
                }
              />
            );
          })}

          <button
            className="btn btn-secondary w-full"
            type="button"
            data-tour="formulario-agregar"
            onClick={() => {
              setEditandoId(null);
              setError(null);
              setObligatoria(true);
              setAgregando(true);
            }}
          >
            Agregar pregunta
          </button>
      </div>

      <Modal
        open={modalPreguntaAbierto}
        title={preguntaEditando ? "Editar pregunta" : "Nueva pregunta"}
        onClose={cerrarModalPregunta}
        wide
        sinCerrar
        headerExtra={
          <InterruptorObligatoria checked={obligatoria} onChange={setObligatoria} />
        }
      >
        {preguntaEditando ? (
          <PreguntaComposer
            key={preguntaEditando.id}
            inicial={{
              enunciado: preguntaEditando.enunciado,
              ayuda: preguntaEditando.ayuda,
              tipo: preguntaEditando.tipo as TipoPregunta,
              opciones: parseOpciones(preguntaEditando.opciones),
              opcionesRaw: preguntaEditando.opciones,
              fechaModo: parseConfigFecha(preguntaEditando.opciones),
              cantidadCorreos: parseConfigCorreo(preguntaEditando.opciones),
              ...parseConfigLimites(preguntaEditando.opciones),
              configGantt: parseConfigGantt(preguntaEditando.opciones),
              configPresupuesto: parseConfigPresupuesto(preguntaEditando.opciones),
              configObjetivos: parseConfigObjetivos(preguntaEditando.opciones),
              obligatoria: preguntaEditando.obligatoria,
              permiteArchivo: preguntaEditando.permiteArchivo,
              permiteImagen: preguntaEditando.permiteImagen,
              permiteVideoLink: preguntaEditando.permiteVideoLink,
              conNotas: preguntaEditando.conNotas,
              escalaNotas: parseEscalaNotas(preguntaEditando.escalaNotas),
            }}
            error={error}
            submitLabel="Guardar pregunta"
            obligatoria={obligatoria}
            onCancel={cerrarModalPregunta}
            onSubmit={onGuardarEdicion}
          />
        ) : agregando ? (
          <PreguntaComposer
            key="nueva-pregunta"
            error={error}
            submitLabel="Agregar esta pregunta"
            obligatoria={obligatoria}
            onCancel={cerrarModalPregunta}
            onSubmit={onAgregar}
          />
        ) : null}
      </Modal>
    </div>
  );
}
