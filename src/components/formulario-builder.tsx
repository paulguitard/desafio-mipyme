"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Modal } from "@/components/modal";
import { PreguntaCampo } from "@/components/pregunta-campo";
import {
  InterruptorObligatoria,
  PreguntaComposer,
  type PreguntaBorrador,
} from "@/components/pregunta-composer";
import {
  esPreguntaNombreCaso,
  preguntaNombreCasoVista,
} from "@/lib/nombre-caso";
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
}: {
  modo: "nuevo" | "existente";
  formulario?: {
    id: string;
    titulo: string;
    descripcion: string;
    preguntas: PreguntaVista[];
  };
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(formulario?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(formulario?.descripcion ?? "");
  const [tituloDraft, setTituloDraft] = useState(formulario?.titulo ?? "");
  const [descripcionDraft, setDescripcionDraft] = useState(formulario?.descripcion ?? "");
  const [editandoTitulo, setEditandoTitulo] = useState(modo === "nuevo" || !formulario?.titulo);
  const [editandoDescripcion, setEditandoDescripcion] = useState(modo === "nuevo");
  const [preguntas, setPreguntas] = useState<PreguntaVista[]>(() => {
    const actuales = formulario?.preguntas ?? [];
    if (actuales.some(esPreguntaNombreCaso)) return actuales;
    return [preguntaNombreCasoVista(crypto.randomUUID()), ...actuales];
  });
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [obligatoria, setObligatoria] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardandoCampo, setGuardandoCampo] = useState<"titulo" | "descripcion" | null>(null);

  const esNuevo = modo === "nuevo";
  const preguntaEditando = editandoId ? preguntas.find((item) => item.id === editandoId) : undefined;
  const modalPreguntaAbierto = agregando || Boolean(preguntaEditando);

  function cerrarModalPregunta() {
    setAgregando(false);
    setEditandoId(null);
    setObligatoria(true);
    setError(null);
  }

  async function persistirTituloDescripcion(siguienteTitulo: string, siguienteDescripcion: string) {
    if (esNuevo || !formulario) return true;
    const tituloFinal = siguienteTitulo.trim();
    if (!tituloFinal) {
      setError("El título es obligatorio.");
      return false;
    }
    const formData = new FormData();
    formData.set("id", formulario.id);
    formData.set("titulo", tituloFinal);
    formData.set("descripcion", siguienteDescripcion);
    const result = await actualizarFormulario(formData);
    if (result?.error) {
      setError(result.error);
      return false;
    }
    setError(null);
    return true;
  }

  async function guardarTitulo() {
    const siguiente = tituloDraft.trim();
    if (!siguiente) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardandoCampo("titulo");
    const ok = await persistirTituloDescripcion(siguiente, descripcion);
    setGuardandoCampo(null);
    if (!ok) return;
    setTitulo(siguiente);
    setTituloDraft(siguiente);
    setEditandoTitulo(false);
  }

  async function guardarDescripcion() {
    setGuardandoCampo("descripcion");
    const ok = await persistirTituloDescripcion(titulo, descripcionDraft);
    setGuardandoCampo(null);
    if (!ok) return;
    setDescripcion(descripcionDraft);
    setEditandoDescripcion(false);
  }

  async function onAgregar(borrador: PreguntaBorrador) {
    const mensaje = validarPregunta(borrador);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError(null);
    if (esNuevo) {
      setPreguntas((actual) => [...actual, preguntaDesdeBorrador(crypto.randomUUID(), borrador)]);
      setAgregando(false);
      return;
    }
    const result = await agregarPregunta(formDataPregunta(formulario!.id, null, borrador));
    if (result?.error || !result?.id) {
      setError(result?.error ?? "No se pudo agregar la pregunta.");
      return;
    }
    setPreguntas((actual) => [...actual, preguntaDesdeBorrador(result.id, borrador)]);
    setAgregando(false);
    router.refresh();
  }

  async function onGuardarEdicion(borrador: PreguntaBorrador) {
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
    setError(null);
    const actualizada = preguntaDesdeBorrador(editandoId, borrador);
    if (esNuevo) {
      setPreguntas((actual) => actual.map((item) => (item.id === editandoId ? actualizada : item)));
      setEditandoId(null);
      return;
    }
    const result = await actualizarPregunta(formDataPregunta(formulario!.id, editandoId, borrador));
    if (result?.error) {
      setError(result.error);
      return;
    }
    setPreguntas((actual) => actual.map((item) => (item.id === editandoId ? actualizada : item)));
    setEditandoId(null);
    router.refresh();
  }

  async function onEliminar(id: string) {
    const actual = preguntas.find((item) => item.id === id);
    if (actual && esPreguntaNombreCaso(actual)) {
      setError("El nombre del caso es una pregunta fija y no se puede eliminar.");
      return;
    }
    if (esNuevo) {
      setPreguntas((actual) => actual.filter((item) => item.id !== id));
      return;
    }
    const formData = new FormData();
    formData.set("id", id);
    formData.set("formularioId", formulario!.id);
    const result = await eliminarPregunta(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setPreguntas((actual) => actual.filter((item) => item.id !== id));
    router.refresh();
  }

  async function onMover(id: string, direccion: "up" | "down") {
    const index = preguntas.findIndex((item) => item.id === id);
    const swapWith = direccion === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= preguntas.length) return;
    if (esPreguntaNombreCaso(preguntas[index]) || esPreguntaNombreCaso(preguntas[swapWith])) return;
    const reordenadas = [...preguntas];
    [reordenadas[index], reordenadas[swapWith]] = [reordenadas[swapWith], reordenadas[index]];
    setPreguntas(reordenadas);
    if (esNuevo) return;
    const formData = new FormData();
    formData.set("id", id);
    formData.set("formularioId", formulario!.id);
    formData.set("direccion", direccion);
    await moverPregunta(formData);
    router.refresh();
  }

  async function onGuardarNuevo() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    const result = await crearFormularioCompleto({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
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
    });
    setGuardando(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BotonAtras href="/admin/formularios" />
            <div className="min-w-0 flex-1">
              <CampoEditable
                editing={editandoTitulo}
                guardando={guardandoCampo === "titulo"}
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
                      id="titulo-formulario"
                      className="input w-full"
                      value={tituloDraft}
                      placeholder="Título del formulario"
                      autoFocus={!editandoDescripcion}
                      onChange={(event) => setTituloDraft(event.target.value)}
                    />
                  </div>
                }
              />
            </div>
          </div>
          {esNuevo ? (
            <button className="btn btn-sm btn-primary shrink-0" type="button" disabled={guardando} onClick={onGuardarNuevo}>
              {guardando ? "Guardando…" : "Guardar formulario"}
            </button>
          ) : null}
        </div>
        {error ? <p className="text-danger">{error}</p> : null}
        <CampoEditable
          editing={editandoDescripcion}
          guardando={guardandoCampo === "descripcion"}
          onEditar={() => {
            setDescripcionDraft(descripcion);
            setEditandoDescripcion(true);
          }}
          onCancelar={() => {
            setDescripcionDraft(descripcion);
            setEditandoDescripcion(false);
            setError(null);
          }}
          onGuardar={guardarDescripcion}
          lectura={
            descripcion ? (
              <p className="inline whitespace-pre-wrap">{descripcion}</p>
            ) : (
              <p className="inline text-muted">Sin descripción</p>
            )
          }
          edicion={
            <div className="field">
              <label htmlFor="descripcion-formulario">Descripción</label>
              <textarea
                id="descripcion-formulario"
                className="input w-full"
                value={descripcionDraft}
                placeholder="Descripción (opcional)"
                rows={3}
                autoFocus={!editandoTitulo}
                onChange={(event) => setDescripcionDraft(event.target.value)}
              />
            </div>
          }
        />
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
