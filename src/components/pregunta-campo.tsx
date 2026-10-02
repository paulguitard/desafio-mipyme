"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

const EditorTextoLargo = dynamic(
  () => import("@/components/editor-texto-largo").then((mod) => mod.EditorTextoLargo),
);
const TextoLargoVista = dynamic(
  () => import("@/components/editor-texto-largo").then((mod) => mod.TextoLargoVista),
);
const CampoGantt = dynamic(
  () => import("@/components/pregunta-formatos").then((mod) => mod.CampoGantt),
);
const CampoPresupuesto = dynamic(
  () => import("@/components/pregunta-formatos").then((mod) => mod.CampoPresupuesto),
);
const CampoObjetivosIndicadores = dynamic(
  () => import("@/components/pregunta-formatos").then((mod) => mod.CampoObjetivosIndicadores),
);
import { VideoEmbed, VideoMiniatura } from "@/components/video-embed";
import { InputCorreo } from "@/components/input-correo";
import { normalizarCorreo } from "@/lib/correo";
import { textoContinuo } from "@/lib/texto-continuo";
import {
  agruparAdjuntos,
  esTipoFormato,
  formatearValorPregunta,
  parseArchivos,
  parseConfigCorreo,
  parseConfigFecha,
  parseConfigLimites,
  parseOpciones,
  parseValor,
  publicUploadUrl,
  resolveVideoEmbed,
  type StoredAttachment,
  type StoredFile,
  type TipoPregunta,
} from "@/lib/preguntas";

function CampoAdjunto({
  id,
  name,
  tipo,
  guardados,
}: {
  id: string;
  name: string;
  tipo: "imagen" | "archivo";
  guardados: StoredFile[];
}) {
  const [nombres, setNombres] = useState<string[]>([]);
  const esImagen = tipo === "imagen";

  function alCambiar(files: FileList | null) {
    setNombres(files ? Array.from(files).map((file) => file.name) : []);
  }

  function quitar() {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setNombres([]);
  }

  return (
    <div className="campo-adjunto">
      <p className="campo-adjunto-titulo">{esImagen ? "Imágenes" : "Archivos"}</p>
      {guardados.length > 0 ? (
        <ul className={esImagen ? "pregunta-adjuntos-lista is-imagenes" : "pregunta-adjuntos-lista"}>
          {guardados.map((file) => (
            <li key={file.id}>
              <AdjuntoArchivo file={file} />
            </li>
          ))}
        </ul>
      ) : null}
      <input
        className="sr-only"
        id={id}
        name={name}
        type="file"
        multiple
        accept={esImagen ? "image/jpeg,image/png,.jpg,.jpeg,.png" : undefined}
        onChange={(event) => alCambiar(event.target.files)}
      />
      <div className="campo-adjunto-fila">
        <label className="btn btn-sm btn-secondary cursor-pointer" htmlFor={id}>
          {esImagen ? "Elegir imágenes" : "Elegir archivos"}
        </label>
        {nombres.length > 0 ? (
          <button className="btn btn-sm btn-ghost" type="button" onClick={quitar}>
            Quitar selección
          </button>
        ) : null}
      </div>
      {nombres.length > 0 ? (
        <ul className="campo-adjunto-pendientes">
          {nombres.map((nombre, index) => (
            <li key={`${index}-${nombre}`} className="campo-adjunto-nombre">
              {nombre}
            </li>
          ))}
        </ul>
      ) : (
        <span className="campo-adjunto-vacio">
          {esImagen ? "Puedes elegir varias imágenes." : "Puedes elegir varios archivos."}
        </span>
      )}
      <p className="text-xs text-muted">
        {esImagen ? "Acepta JPG o PNG." : "PDF u otro documento, máximo 2 MB cada uno."}
      </p>
    </div>
  );
}

function CampoVideoLinks({
  id,
  name,
  urlsIniciales,
  disabled,
  preview,
}: {
  id: string;
  name?: string;
  urlsIniciales: string[];
  disabled?: boolean;
  preview?: boolean;
}) {
  const [urls, setUrls] = useState(() => (preview ? [""] : urlsIniciales.length > 0 ? urlsIniciales : [""]));
  const bloqueado = Boolean(disabled || preview);

  function actualizar(index: number, value: string) {
    setUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  }

  function quitar(index: number) {
    setUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  }

  return (
    <div className="campo-adjunto">
      <p className="campo-adjunto-titulo">Links de video</p>
      <div className="campo-adjunto-videos">
        {urls.map((url, index) => (
          <div key={`${id}-${index}`} className="campo-adjunto-video-item">
            <div className="campo-adjunto-fila">
              <input
                className="input campo-adjunto-url"
                id={index === 0 ? id : `${id}-${index}`}
                name={name}
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(event) => actualizar(index, event.target.value)}
                disabled={bloqueado}
              />
              {url && !bloqueado ? (
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => quitar(index)}>
                  Quitar
                </button>
              ) : null}
            </div>
            {!preview && url.trim() && resolveVideoEmbed(url) ? <VideoEmbed url={url} /> : null}
          </div>
        ))}
      </div>
      {bloqueado ? null : (
        <button className="btn btn-sm btn-secondary self-start" type="button" onClick={() => setUrls((prev) => [...prev, ""])}>
          Agregar otro link
        </button>
      )}
      <p className="text-xs text-muted">YouTube, Vimeo, Google Drive o SharePoint.</p>
    </div>
  );
}

function valorTexto(valor: unknown) {
  if (Array.isArray(valor)) return valor.join(", ");
  if (valor == null) return "";
  return String(valor);
}

const OPCIONES_SI_NO = [
  {
    valor: "Sí",
    activo: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
    inactivo: "border-border bg-white text-navy hover:border-emerald-600 hover:text-emerald-700",
  },
  {
    valor: "No",
    activo: "border-red bg-red text-white shadow-sm",
    inactivo: "border-border bg-white text-navy hover:border-red hover:text-red",
  },
] as const;

function BotonesSiNo({
  name,
  valor,
  readOnly,
}: {
  name: string;
  valor: string;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sí o No">
        {OPCIONES_SI_NO.map((opcion) => {
          const seleccionado = valor === opcion.valor;
          return (
            <span
              key={opcion.valor}
              className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold ${
                seleccionado ? opcion.activo : "border-border bg-slate-50 text-muted"
              }`}
            >
              {opcion.valor}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap gap-2" role="radiogroup" aria-label="Sí o No">
      {OPCIONES_SI_NO.map((opcion) => (
        <label key={opcion.valor} className="cursor-pointer select-none">
          <input
            type="radio"
            className="peer sr-only"
            name={name}
            value={opcion.valor}
            defaultChecked={valor === opcion.valor}
          />
          <span
            className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy ${
              opcion.valor === "Sí"
                ? `${opcion.inactivo} peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:hover:border-emerald-600 peer-checked:hover:text-white`
                : `${opcion.inactivo} peer-checked:border-red peer-checked:bg-red peer-checked:text-white peer-checked:hover:border-red peer-checked:hover:text-white`
            }`}
          >
            {opcion.valor}
          </span>
        </label>
      ))}
    </div>
  );
}

function etiquetaArchivo(file: StoredFile) {
  const nombre = file.originalName.toLowerCase();
  if (file.mimeType.includes("pdf") || nombre.endsWith(".pdf")) return "PDF";
  const ext = file.originalName.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : "DOC";
}

function AdjuntoArchivo({ file }: { file: StoredFile }) {
  if (file.kind === "image") {
    return (
      <a
        href={publicUploadUrl(file)}
        target="_blank"
        rel="noreferrer"
        className="pregunta-adjuntos-link"
        title={`Abrir ${file.originalName}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicUploadUrl(file, { width: 1200 })} alt={file.originalName} className="pregunta-adjuntos-media" />
      </a>
    );
  }

  const etiqueta = etiquetaArchivo(file);

  return (
    <a
      className="pregunta-adjuntos-doc"
      href={publicUploadUrl(file)}
      target="_blank"
      rel="noreferrer"
      title={`Abrir ${file.originalName}`}
      aria-label={`Abrir ${file.originalName}`}
    >
      <span className="pregunta-adjuntos-doc-sheet" aria-hidden="true">
        <span className="pregunta-adjuntos-doc-fold" />
        <span className="pregunta-adjuntos-doc-badge">{etiqueta}</span>
        <span className="pregunta-adjuntos-doc-lines">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="pregunta-adjuntos-doc-name">{file.originalName}</span>
    </a>
  );
}

export function ArchivosLista({ archivos }: { archivos: StoredAttachment[] }) {
  const { imagenes, documentos } = agruparAdjuntos(archivos);
  if (imagenes.length === 0 && documentos.length === 0) return null;
  return (
    <div className="pregunta-adjuntos-grupos">
      {imagenes.length > 0 ? (
        <section className="pregunta-adjuntos-grupo">
          <h5>Imágenes</h5>
          <ul className="pregunta-adjuntos-lista is-imagenes">
            {imagenes.map((file) => (
              <li key={file.id}>
                <AdjuntoArchivo file={file} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {documentos.length > 0 ? (
        <section className="pregunta-adjuntos-grupo">
          <h5>Archivos</h5>
          <ul className="pregunta-adjuntos-lista">
            {documentos.map((file) => (
              <li key={file.id}>
                <AdjuntoArchivo file={file} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function AdjuntosRespuesta({ archivos }: { archivos: StoredAttachment[] }) {
  const { imagenes, documentos, videos } = agruparAdjuntos(archivos);
  if (imagenes.length === 0 && documentos.length === 0 && videos.length === 0) return null;

  return (
    <aside className="pregunta-adjuntos">
      <h4>Adjuntos</h4>
      <div className="pregunta-adjuntos-grupos">
        {imagenes.length > 0 ? (
          <section className="pregunta-adjuntos-grupo">
            <h5>Imágenes</h5>
            <ul className="pregunta-adjuntos-lista is-imagenes">
              {imagenes.map((file) => (
                <li key={file.id}>
                  <AdjuntoArchivo file={file} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {documentos.length > 0 ? (
          <section className="pregunta-adjuntos-grupo">
            <h5>Archivos</h5>
            <ul className="pregunta-adjuntos-lista">
              {documentos.map((file) => (
                <li key={file.id}>
                  <AdjuntoArchivo file={file} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {videos.length > 0 ? (
          <section className="pregunta-adjuntos-grupo">
            <h5>Links de video</h5>
            <ul className="pregunta-adjuntos-lista is-videos">
              {videos.map((video) => (
                <li key={video.id}>
                  <VideoMiniatura url={video.url} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

export function PreguntaCampo({
  pregunta,
  respuesta,
  readOnly,
  disabled,
  preview,
  acciones,
}: {
  pregunta: {
    id: string;
    enunciado: string;
    ayuda: string;
    tipo: string;
    opciones: string;
    obligatoria: boolean;
    permiteArchivo: boolean;
    permiteImagen: boolean;
    permiteVideoLink?: boolean;
  };
  respuesta?: { valor: string; archivos: string } | null;
  readOnly?: boolean;
  disabled?: boolean;
  preview?: boolean;
  acciones?: ReactNode;
}) {
  const opciones = parseOpciones(pregunta.opciones);
  const valor = parseValor(respuesta?.valor ?? "");
  const archivos = parseArchivos(respuesta?.archivos ?? "[]");
  const { imagenes, documentos, videos } = agruparAdjuntos(archivos);
  const tipo = pregunta.tipo as TipoPregunta;
  const modoFecha = parseConfigFecha(pregunta.opciones);
  const cantidadCorreos = parseConfigCorreo(pregunta.opciones);
  const limites = parseConfigLimites(pregunta.opciones);
  const name = preview ? `preview-${pregunta.id}` : `valor-${pregunta.id}`;
  const locked = Boolean(readOnly || disabled);
  const tituloId = `pregunta-titulo-${pregunta.id}`;
  const titulo = (
    <h3 id={tituloId} className="min-w-0 flex-1 text-xl font-semibold">
      {pregunta.enunciado}
      {pregunta.obligatoria ? " *" : ""}
    </h3>
  );
  const encabezado = (
    <div className="flex items-start justify-between gap-3">
      {titulo}
      {acciones ? <div className="flex shrink-0 items-center gap-1">{acciones}</div> : null}
    </div>
  );

  if (locked) {
    const textoCorto = formatearValorPregunta(tipo, valor, pregunta.opciones);
    const valorNodo =
      tipo === "texto_largo" ? (
        <TextoLargoVista html={valorTexto(valor)} />
      ) : tipo === "si_no" ? (
        <BotonesSiNo name={name} valor={valorTexto(valor)} readOnly />
      ) : esTipoFormato(tipo) ? (
        tipo === "gantt" ? (
          <CampoGantt name={name} opcionesRaw={pregunta.opciones} valorInicial={valor} readOnly />
        ) : tipo === "presupuesto" ? (
          <CampoPresupuesto name={name} opcionesRaw={pregunta.opciones} valorInicial={valor} readOnly />
        ) : (
          <CampoObjetivosIndicadores
            name={name}
            opcionesRaw={pregunta.opciones}
            valorInicial={valor}
            readOnly
          />
        )
      ) : (
        <p className={`texto-solo-lectura${textoCorto ? "" : " is-vacio"}`}>
          {textoCorto ? textoContinuo(textoCorto) : "Sin respuesta"}
        </p>
      );

    const hayAdjuntos = archivos.length > 0;

    return (
      <section className="card pregunta-lectura">
        <div className="pregunta-lectura-enunciado">{encabezado}</div>
        <div className="pregunta-lectura-cuerpo">
          {pregunta.ayuda ? <p className="text-muted">{pregunta.ayuda}</p> : null}
          <div className={hayAdjuntos ? "pregunta-con-adjuntos" : undefined}>
            <div className="pregunta-valor min-w-0">{valorNodo}</div>
            <AdjuntosRespuesta archivos={archivos} />
          </div>
        </div>
      </section>
    );
  }

  const correosActuales = Array.isArray(valor)
    ? valor.map((item) => normalizarCorreo(String(item)))
    : valor
      ? [normalizarCorreo(String(valor))]
      : [];
  const fechaRango =
    valor && typeof valor === "object" && !Array.isArray(valor)
      ? {
          desde: String((valor as { desde?: unknown }).desde ?? ""),
          hasta: String((valor as { hasta?: unknown }).hasta ?? ""),
        }
      : { desde: "", hasta: "" };

  return (
    <fieldset className="card space-y-3 p-5" aria-labelledby={tituloId}>
      {encabezado}
      {pregunta.ayuda ? <p className="text-muted">{pregunta.ayuda}</p> : null}

      {tipo === "texto_corto" ? (
        <input
          className="input w-full"
          name={name}
          defaultValue={valorTexto(valor)}
          maxLength={limites.maxCaracteres ?? undefined}
        />
      ) : null}
      {tipo === "texto_largo" ? (
        <EditorTextoLargo name={name} defaultValue={valorTexto(valor)} />
      ) : null}
      {tipo === "numero" ? (
        <input
          className="input w-full"
          name={name}
          type="number"
          inputMode="decimal"
          step="any"
          defaultValue={valorTexto(valor)}
        />
      ) : null}
      {tipo === "fecha" && modoFecha === "unica" ? (
        <input className="input w-full" name={name} type="date" defaultValue={valorTexto(valor)} />
      ) : null}
      {tipo === "fecha" && modoFecha === "rango" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor={`${name}-desde`}>Fecha inicio</label>
            <input
              className="input w-full"
              id={`${name}-desde`}
              name={`${name}-desde`}
              type="date"
              defaultValue={fechaRango.desde}
            />
          </div>
          <div className="field">
            <label htmlFor={`${name}-hasta`}>Fecha término</label>
            <input
              className="input w-full"
              id={`${name}-hasta`}
              name={`${name}-hasta`}
              type="date"
              defaultValue={fechaRango.hasta}
            />
          </div>
        </div>
      ) : null}
      {tipo === "correo" ? (
        <div className="space-y-3">
          {Array.from({ length: cantidadCorreos }, (_, index) => (
            <div key={index} className="field">
              <label htmlFor={`${name}-${index}`}>
                Correo{cantidadCorreos > 1 ? ` ${index + 1}` : ""}
              </label>
              <InputCorreo
                className="input w-full"
                id={`${name}-${index}`}
                name={name}
                autoComplete="email"
                placeholder="nombre@correo.com"
                defaultValue={correosActuales[index] ?? ""}
              />
            </div>
          ))}
        </div>
      ) : null}
      {tipo === "lista" ? (
        <select className="input w-full" name={name} defaultValue={valorTexto(valor)}>
          <option value="">Selecciona una opción</option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      ) : null}
      {tipo === "si_no" ? <BotonesSiNo name={name} valor={valorTexto(valor)} /> : null}
      {tipo === "opcion_unica" ? (
        <div className="space-y-2">
          {opciones.map((opcion) => (
            <label key={opcion} className="flex items-center gap-2">
              <input
                type="radio"
                name={name}
                value={opcion}
                defaultChecked={valorTexto(valor) === opcion}
              />
              {opcion}
            </label>
          ))}
        </div>
      ) : null}
      {tipo === "opcion_multiple" ? (
        <div className="space-y-2">
          {opciones.map((opcion) => (
            <label key={opcion} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={name}
                value={opcion}
                defaultChecked={Array.isArray(valor) && valor.includes(opcion)}
              />
              {opcion}
            </label>
          ))}
        </div>
      ) : null}

      {tipo === "gantt" ? (
        <CampoGantt name={name} opcionesRaw={pregunta.opciones} valorInicial={valor} />
      ) : null}
      {tipo === "presupuesto" ? (
        <CampoPresupuesto name={name} opcionesRaw={pregunta.opciones} valorInicial={valor} />
      ) : null}
      {tipo === "objetivos_indicadores" ? (
        <CampoObjetivosIndicadores name={name} opcionesRaw={pregunta.opciones} valorInicial={valor} />
      ) : null}

      {pregunta.permiteImagen ? (
        <CampoAdjunto id={`imagen-${pregunta.id}`} name={`imagen-${pregunta.id}`} tipo="imagen" guardados={imagenes} />
      ) : null}
      {pregunta.permiteArchivo ? (
        <CampoAdjunto id={`archivo-${pregunta.id}`} name={`archivo-${pregunta.id}`} tipo="archivo" guardados={documentos} />
      ) : null}
      {pregunta.permiteVideoLink ? (
        <CampoVideoLinks
          id={`video-${pregunta.id}`}
          name={preview ? undefined : `video-${pregunta.id}`}
          urlsIniciales={videos.map((video) => video.url)}
          preview={preview}
        />
      ) : null}
    </fieldset>
  );
}

export function formatValorRespuesta(valorRaw: string, archivosRaw: string, tipo = "", opciones = "[]") {
  const valor = parseValor(valorRaw);
  const archivos = parseArchivos(archivosRaw);
  const texto = formatearValorPregunta(tipo || "texto_corto", valor, opciones) || "(sin texto)";
  const { documentos, imagenes, videos } = agruparAdjuntos(archivos);
  const partes = [texto];
  if (imagenes.length) partes.push(`Imágenes: ${imagenes.map((a) => a.originalName).join(", ")}`);
  if (documentos.length) partes.push(`Archivos: ${documentos.map((a) => a.originalName).join(", ")}`);
  if (videos.length) partes.push(`Videos: ${videos.map((v) => v.url).join(", ")}`);
  return partes.join(" · ");
}
