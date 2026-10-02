"use client";

import { useEffect, useRef, useState } from "react";
import {
  actualizarFormulario,
  actualizarPiezaContenido,
  agregarMedioContenido,
  agregarPiezaContenido,
  crearFormularioContenido,
  eliminarMedioContenido,
  eliminarPiezaContenido,
  moverPiezaContenido,
} from "@/actions/formularios";
import { BotonAtras } from "@/components/boton-atras";
import { CampoEditable } from "@/components/campo-editable";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { Modal } from "@/components/modal";
import { PiezaContenidoVista } from "@/components/pieza-contenido-vista";
import {
  medioDesdeFila,
  parseMedioPayload,
  type ClaseMedioContenido,
  type PiezaContenidoVista as PiezaVista,
} from "@/lib/contenido";
import { errorDeResultado, useAccionOptimista } from "@/lib/use-dato-optimista";

type MedioLocal = PiezaVista["medios"][number] & {
  file?: File;
  videoUrl?: string;
};

type PiezaLocal = {
  id: string;
  titulo: string;
  descripcion: string;
  orden: number;
  medios: MedioLocal[];
};

const btnIcono =
  "inline-flex size-8 items-center justify-center rounded-md text-navy transition-colors hover:bg-navy-soft disabled:pointer-events-none disabled:opacity-40";
const btnIconoDanger =
  "inline-flex size-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-navy-soft disabled:pointer-events-none disabled:opacity-40";

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
      <path
        d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function piezaDesdeServidor(pieza: {
  id: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  medios: { id: string; orden: number; clase: string; payload: string }[];
}): PiezaLocal {
  return {
    id: pieza.id,
    titulo: pieza.titulo,
    descripcion: pieza.descripcion ?? "",
    orden: pieza.orden,
    medios: pieza.medios
      .map(medioDesdeFila)
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

function esIdTemporal(id: string) {
  return id.startsWith("tmp-");
}

export function FormularioContenidoBuilder({
  modo,
  formulario,
}: {
  modo: "nuevo" | "existente";
  formulario?: {
    id: string;
    titulo: string;
    piezas: {
      id: string;
      titulo: string;
      descripcion?: string;
      orden: number;
      medios: { id: string; orden: number; clase: string; payload: string }[];
    }[];
  };
}) {
  const accion = useAccionOptimista();
  const [piezas, setPiezas] = useState<PiezaLocal[]>(
    (formulario?.piezas ?? []).map(piezaDesdeServidor),
  );
  const [titulo, setTitulo] = useState(formulario?.titulo ?? "");
  const [tituloDraft, setTituloDraft] = useState(formulario?.titulo ?? "");
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const tituloInputRef = useRef<HTMLInputElement>(null);
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [draftTitulo, setDraftTitulo] = useState("");
  const [draftDescripcion, setDraftDescripcion] = useState("");
  const [draftMedios, setDraftMedios] = useState<MedioLocal[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const error = accion.error;
  const setError = (valor: string | null) => accion.setError(valor);
  const esNuevo = modo === "nuevo";
  const modalAbierto = agregando || Boolean(editandoId);

  useEffect(() => {
    if (esNuevo || !formulario?.titulo) setEditandoTitulo(true);
  }, [esNuevo, formulario?.titulo]);

  useEffect(() => {
    if (editandoTitulo) tituloInputRef.current?.focus();
  }, [editandoTitulo]);

  function cerrarModal() {
    setAgregando(false);
    setEditandoId(null);
    setDraftTitulo("");
    setDraftDescripcion("");
    setDraftMedios([]);
    setVideoUrl("");
    setError(null);
  }

  function abrirNueva() {
    setEditandoId(null);
    setDraftTitulo("");
    setDraftDescripcion("");
    setDraftMedios([]);
    setVideoUrl("");
    setError(null);
    setAgregando(true);
  }

  function abrirEditar(pieza: PiezaLocal) {
    setAgregando(false);
    setDraftTitulo(pieza.titulo);
    setDraftDescripcion(pieza.descripcion);
    setDraftMedios(pieza.medios);
    setVideoUrl("");
    setError(null);
    setEditandoId(pieza.id);
  }

  function persistirTitulo(siguienteTitulo: string) {
    if (esNuevo || !formulario) return;
    const tituloFinal = siguienteTitulo.trim();
    if (!tituloFinal) {
      setError("El título es obligatorio.");
      return;
    }
    const formData = new FormData();
    formData.set("id", formulario.id);
    formData.set("titulo", tituloFinal);
    void accion.ejecutar(async () => {
      const result = await actualizarFormulario(formData);
      if (result && "error" in result && result.error) return result;
      setTitulo(tituloFinal);
      setEditandoTitulo(false);
      return result;
    });
  }

  function guardarTitulo() {
    const siguiente = tituloDraft.trim();
    if (!siguiente) {
      setError("El título es obligatorio.");
      return;
    }
    setTitulo(siguiente);
    setEditandoTitulo(false);
    persistirTitulo(siguiente);
  }

  function onGuardarNuevo() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (piezas.length === 0) {
      setError("Agrega al menos una casilla de contenido.");
      return;
    }
    if (piezas.some((pieza) => !pieza.titulo.trim())) {
      setError("Cada casilla necesita un título.");
      return;
    }
    const formData = new FormData();
    formData.set("titulo", titulo.trim());
    formData.set(
      "piezas",
      JSON.stringify(
        piezas.map((pieza) => ({
          titulo: pieza.titulo.trim(),
          descripcion: pieza.descripcion.trim(),
          medios: pieza.medios.length,
        })),
      ),
    );
    piezas.forEach((pieza, i) => {
      pieza.medios.forEach((medio, j) => {
        formData.set(`medio-${i}-${j}-clase`, medio.clase);
        if (medio.videoUrl) formData.set(`medio-${i}-${j}-videoUrl`, medio.videoUrl);
        if (medio.file) formData.set(`medio-${i}-${j}-archivo`, medio.file);
      });
    });
    void accion.ejecutar(() => crearFormularioContenido(formData));
  }

  async function agregarMedioDraft(clase: ClaseMedioContenido, file?: File, url?: string) {
    if (clase === "video") {
      if (!url?.trim()) {
        setError("Pega un link de video.");
        return;
      }
      setDraftMedios((lista) => [
        ...lista,
        {
          id: `tmp-${crypto.randomUUID()}`,
          orden: lista.length + 1,
          clase,
          videoUrl: url.trim(),
          attachment: { id: crypto.randomUUID(), kind: "video_link", url: url.trim(), provider: "youtube" },
        },
      ]);
      setVideoUrl("");
      setError(null);
      return;
    }
    if (!file) {
      setError(clase === "imagen" ? "Elige una foto." : "Elige un archivo.");
      return;
    }
    const preview = clase === "imagen" ? URL.createObjectURL(file) : undefined;
    setDraftMedios((lista) => [
      ...lista,
      {
        id: `tmp-${crypto.randomUUID()}`,
        orden: lista.length + 1,
        clase,
        file,
        attachment: {
          id: crypto.randomUUID(),
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          kind: clase === "imagen" ? "image" : "file",
          relativePath: "",
          url: preview,
        },
      },
    ]);
    setError(null);
  }

  async function guardarCasilla() {
    const tituloFinal = draftTitulo.trim();
    const descripcionFinal = draftDescripcion.trim();
    if (!tituloFinal) {
      setError("El título de la casilla es obligatorio.");
      return;
    }
    if (esNuevo) {
      if (agregando) {
        setPiezas((lista) => [
          ...lista,
          {
            id: `tmp-${crypto.randomUUID()}`,
            titulo: tituloFinal,
            descripcion: descripcionFinal,
            orden: lista.length + 1,
            medios: draftMedios,
          },
        ]);
      } else if (editandoId) {
        setPiezas((lista) =>
          lista.map((pieza) =>
            pieza.id === editandoId
              ? { ...pieza, titulo: tituloFinal, descripcion: descripcionFinal, medios: draftMedios }
              : pieza,
          ),
        );
      }
      cerrarModal();
      return;
    }
    if (!formulario) return;

    const result = await accion.ejecutar(async () => {
      let piezaId = editandoId;
      const original = piezas.find((pieza) => pieza.id === editandoId);
      if (agregando || !piezaId) {
        const formData = new FormData();
        formData.set("formularioId", formulario.id);
        formData.set("titulo", tituloFinal);
        formData.set("descripcion", descripcionFinal);
        const creada = await agregarPiezaContenido(formData);
        if (creada && "error" in creada && creada.error) return creada;
        piezaId = creada && "id" in creada ? String(creada.id) : "";
        if (!piezaId) return { error: "No se pudo crear la casilla." };
      } else {
        const formData = new FormData();
        formData.set("id", piezaId);
        formData.set("formularioId", formulario.id);
        formData.set("titulo", tituloFinal);
        formData.set("descripcion", descripcionFinal);
        const actualizada = await actualizarPiezaContenido(formData);
        if (actualizada && "error" in actualizada && actualizada.error) return actualizada;
      }

      const actuales = new Set(draftMedios.map((medio) => medio.id));
      for (const medio of original?.medios ?? []) {
        if (esIdTemporal(medio.id) || actuales.has(medio.id)) continue;
        const formData = new FormData();
        formData.set("id", medio.id);
        formData.set("formularioId", formulario.id);
        const borrado = await eliminarMedioContenido(formData);
        if (borrado && "error" in borrado && borrado.error) return borrado;
      }

      const persistidos: MedioLocal[] = [];
      for (const medio of draftMedios) {
        if (!esIdTemporal(medio.id)) {
          persistidos.push(medio);
          continue;
        }
        const formData = new FormData();
        formData.set("formularioId", formulario.id);
        formData.set("piezaId", piezaId as string);
        formData.set("clase", medio.clase);
        if (medio.videoUrl) formData.set("videoUrl", medio.videoUrl);
        if (medio.file) formData.set("archivo", medio.file);
        const creado = await agregarMedioContenido(formData);
        if (creado && "error" in creado && creado.error) return creado;
        const parsed =
          creado && "payload" in creado && creado.payload ? parseMedioPayload(creado.payload) : null;
        persistidos.push({
          id: (creado && "id" in creado && creado.id) || medio.id,
          orden: medio.orden,
          clase: medio.clase,
          attachment: parsed ?? medio.attachment,
        });
      }

      const idFinal = piezaId as string;
      setPiezas((lista) => {
        if (agregando || !lista.some((pieza) => pieza.id === idFinal)) {
          return [
            ...lista,
            {
              id: idFinal,
              titulo: tituloFinal,
              descripcion: descripcionFinal,
              orden: lista.length + 1,
              medios: persistidos,
            },
          ];
        }
        return lista.map((pieza) =>
          pieza.id === idFinal
            ? { ...pieza, titulo: tituloFinal, descripcion: descripcionFinal, medios: persistidos }
            : pieza,
        );
      });
      return { ok: true };
    });
    if (errorDeResultado(result)) return;
    cerrarModal();
  }

  function mover(index: number, direccion: "up" | "down") {
    const destino = direccion === "up" ? index - 1 : index + 1;
    if (destino < 0 || destino >= piezas.length) return;
    const pieza = piezas[index];
    setPiezas((lista) => {
      const next = [...lista];
      [next[index], next[destino]] = [next[destino], next[index]];
      return next;
    });
    if (esNuevo || !formulario) return;
    const formData = new FormData();
    formData.set("id", pieza.id);
    formData.set("formularioId", formulario.id);
    formData.set("direccion", direccion);
    void accion.ejecutar(() => moverPiezaContenido(formData));
  }

  function eliminar(pieza: PiezaLocal) {
    if (!window.confirm("¿Eliminar esta casilla?")) return;
    setPiezas((lista) => lista.filter((item) => item.id !== pieza.id));
    if (esNuevo || !formulario) return;
    const formData = new FormData();
    formData.set("id", pieza.id);
    formData.set("formularioId", formulario.id);
    void accion.ejecutar(() => eliminarPiezaContenido(formData));
  }

  const draftVista: PiezaVista = {
    id: editandoId ?? "borrador",
    orden: 0,
    titulo: draftTitulo.trim() || "Sin título",
    descripcion: draftDescripcion,
    medios: draftMedios,
  };

  return (
    <div className="page-workspace mx-auto grid h-full min-h-0 w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BotonAtras href="/admin/formularios" />
            <div className="min-w-0 flex-1">
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
                    <label htmlFor="titulo-formulario-contenido">Título del formulario</label>
                    <input
                      ref={tituloInputRef}
                      id="titulo-formulario-contenido"
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
            <button className="btn btn-sm btn-primary shrink-0" type="button" onClick={onGuardarNuevo}>
              Guardar formulario
            </button>
          ) : null}
        </div>
        <p className="text-sm text-muted">Cada casilla es un bloque de contenido. Edítala para cambiar el título, la descripción o sus archivos.</p>
        {error && !modalAbierto ? <p className="text-danger">{error}</p> : null}
        <IndicadorGuardando visible={accion.guardando} />
      </div>

      <div className="page-scroll min-h-0 space-y-8 overflow-y-auto overscroll-contain pr-1 pb-8">
        {piezas.map((pieza, index) => (
          <PiezaContenidoVista
            key={pieza.id}
            checkbox={false}
            pieza={{
              id: pieza.id,
              orden: pieza.orden,
              titulo: pieza.titulo,
              descripcion: pieza.descripcion,
              medios: pieza.medios,
            }}
            acciones={
              <>
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Subir"
                  title="Subir"
                  disabled={index === 0}
                  onClick={() => mover(index, "up")}
                >
                  <IconoSubir />
                </button>
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Bajar"
                  title="Bajar"
                  disabled={index === piezas.length - 1}
                  onClick={() => mover(index, "down")}
                >
                  <IconoBajar />
                </button>
                <button
                  className={btnIcono}
                  type="button"
                  aria-label="Editar"
                  title="Editar"
                  onClick={() => abrirEditar(pieza)}
                >
                  <IconoEditar />
                </button>
                <button
                  className={btnIconoDanger}
                  type="button"
                  aria-label="Eliminar"
                  title="Eliminar"
                  onClick={() => eliminar(pieza)}
                >
                  <IconoEliminar />
                </button>
              </>
            }
          />
        ))}
        <button className="btn btn-secondary w-full" type="button" onClick={abrirNueva}>
          Agregar casilla
        </button>
      </div>

      <Modal
        open={modalAbierto}
        title={editandoId ? "Editar casilla" : "Nueva casilla"}
        onClose={cerrarModal}
        wide
      >
        <div className="grid gap-4">
          {error && modalAbierto ? <p className="text-danger">{error}</p> : null}
          <div className="field">
            <label htmlFor="titulo-casilla">Título de la casilla</label>
            <input
              className="input"
              id="titulo-casilla"
              value={draftTitulo}
              placeholder="Ej. Video de introducción"
              onChange={(event) => setDraftTitulo(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="descripcion-casilla">Descripción (opcional)</label>
            <textarea
              className="input"
              id="descripcion-casilla"
              rows={3}
              value={draftDescripcion}
              placeholder="Texto que aparece debajo del título"
              onChange={(event) => setDraftDescripcion(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-navy">Archivos de esta casilla</p>
            <PiezaContenidoVista
              checkbox={false}
              pieza={{ ...draftVista, titulo: "", descripcion: "" }}
              onQuitarMedio={(medioId) =>
                setDraftMedios((lista) => lista.filter((medio) => medio.id !== medioId))
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="btn btn-secondary">
              Agregar foto
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void agregarMedioDraft("imagen", file);
                }}
              />
            </label>
            <label className="btn btn-secondary">
              Agregar archivo
              <input
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void agregarMedioDraft("archivo", file);
                }}
              />
            </label>
          </div>
          <div className="field">
            <label htmlFor="link-video-casilla">Link de video</label>
            <div className="flex flex-wrap gap-2">
              <input
                className="input min-w-[12rem] flex-1"
                id="link-video-casilla"
                value={videoUrl}
                placeholder="YouTube, Vimeo, Drive o SharePoint"
                onChange={(event) => setVideoUrl(event.target.value)}
              />
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void agregarMedioDraft("video", undefined, videoUrl)}
              >
                Agregar video
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={() => void guardarCasilla()}>
              {editandoId ? "Guardar casilla" : "Agregar esta casilla"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={cerrarModal}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
