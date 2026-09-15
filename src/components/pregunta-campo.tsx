import type { ReactNode } from "react";
import { EditorTextoLargo, TextoLargoVista } from "@/components/editor-texto-largo";
import {
  CampoGantt,
  CampoObjetivosIndicadores,
  CampoPresupuesto,
} from "@/components/pregunta-formatos";
import { VideoEmbed, VideoMiniatura } from "@/components/video-embed";
import {
  esTipoFormato,
  formatearValorPregunta,
  getVideoLink,
  isStoredFile,
  parseArchivos,
  parseConfigCorreo,
  parseConfigFecha,
  parseConfigLimites,
  parseOpciones,
  parseValor,
  publicUploadUrl,
  type StoredAttachment,
  type StoredFile,
  type TipoPregunta,
} from "@/lib/preguntas";

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
        <img src={publicUploadUrl(file)} alt={file.originalName} className="pregunta-adjuntos-media" />
      </a>
    );
  }

  return (
    <a
      className="pregunta-adjuntos-file"
      href={publicUploadUrl(file)}
      target="_blank"
      rel="noreferrer"
    >
      {file.originalName}
    </a>
  );
}

export function ArchivosLista({ archivos }: { archivos: StoredAttachment[] }) {
  const files: StoredFile[] = archivos.filter(isStoredFile);
  if (files.length === 0) return null;
  return (
    <ul className="pregunta-adjuntos-lista">
      {files.map((file) => (
        <li key={file.id}>
          <AdjuntoArchivo file={file} />
        </li>
      ))}
    </ul>
  );
}

export function VideoLinkVista({ archivos }: { archivos: StoredAttachment[] }) {
  const video = getVideoLink(archivos);
  if (!video) return null;
  return <VideoEmbed url={video.url} />;
}

export function AdjuntosRespuesta({ archivos }: { archivos: StoredAttachment[] }) {
  const files = archivos.filter(isStoredFile);
  const video = getVideoLink(archivos);
  if (files.length === 0 && !video) return null;

  return (
    <aside className="pregunta-adjuntos">
      <h4>Adjuntos</h4>
      <ul className="pregunta-adjuntos-lista">
        {files.map((file) => (
          <li key={file.id}>
            <AdjuntoArchivo file={file} />
          </li>
        ))}
        {video ? (
          <li>
            <VideoMiniatura url={video.url} />
          </li>
        ) : null}
      </ul>
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
  const videoLink = getVideoLink(archivos);
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
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-white p-4">
          {formatearValorPregunta(tipo, valor, pregunta.opciones) || "Sin respuesta"}
        </p>
      );

    const hayAdjuntos = archivos.length > 0;

    return (
      <section className="card space-y-3 p-5">
        {encabezado}
        {pregunta.ayuda ? <p className="text-muted">{pregunta.ayuda}</p> : null}
        <div className={hayAdjuntos ? "pregunta-con-adjuntos" : undefined}>
          <div className="pregunta-valor min-w-0">{valorNodo}</div>
          <AdjuntosRespuesta archivos={archivos} />
        </div>
      </section>
    );
  }

  const correosActuales = Array.isArray(valor)
    ? valor.map(String)
    : valor
      ? [String(valor)]
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
              <input
                className="input w-full"
                id={`${name}-${index}`}
                name={name}
                type="email"
                inputMode="email"
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

      <ArchivosLista archivos={archivos} />

      {pregunta.permiteArchivo ? (
        <div className="field">
          <label htmlFor={`archivo-${pregunta.id}`}>Adjuntar archivo</label>
          <input
            className="input"
            id={`archivo-${pregunta.id}`}
            name={`archivo-${pregunta.id}`}
            type="file"
          />
          <p className="text-xs text-muted">Máximo 2 MB. Al guardarlo podrás abrirlo en una pestaña nueva.</p>
        </div>
      ) : null}
      {pregunta.permiteImagen ? (
        <div className="field">
          <label htmlFor={`imagen-${pregunta.id}`}>Adjuntar imagen</label>
          <input
            className="input"
            id={`imagen-${pregunta.id}`}
            name={`imagen-${pregunta.id}`}
            type="file"
            accept="image/*"
          />
          <p className="text-xs text-muted">
            Se redimensiona y comprime automáticamente a un máximo de 250 KB.
          </p>
        </div>
      ) : null}
      {pregunta.permiteVideoLink ? (
        <div className="field">
          <label htmlFor={`video-${pregunta.id}`}>
            Link de video (YouTube, Vimeo, Google Drive o SharePoint)
          </label>
          <input
            className="input w-full"
            id={`video-${pregunta.id}`}
            name={preview ? undefined : `video-${pregunta.id}`}
            type="url"
            placeholder="https://..."
            defaultValue={preview ? "" : (videoLink?.url ?? "")}
            disabled={preview}
          />
          {!preview && videoLink ? <VideoLinkVista archivos={archivos} /> : null}
        </div>
      ) : null}
    </fieldset>
  );
}

export function formatValorRespuesta(valorRaw: string, archivosRaw: string, tipo = "", opciones = "[]") {
  const valor = parseValor(valorRaw);
  const archivos = parseArchivos(archivosRaw);
  const texto = formatearValorPregunta(tipo || "texto_corto", valor, opciones) || "(sin texto)";
  const files = archivos.filter(isStoredFile);
  const video = getVideoLink(archivos);
  const partes = [texto];
  if (files.length) partes.push(files.map((a) => a.originalName).join(", "));
  if (video) partes.push(video.url);
  return partes.join(" · ");
}
