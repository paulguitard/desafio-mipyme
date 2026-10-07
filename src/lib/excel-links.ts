import { normalizarCorreo } from "@/lib/correo";
import {
  estadoRespuestaFicha,
  etiquetaEstadoRespuestaFicha,
  type PostulacionFiltroItem,
  type PreguntaFiltro,
} from "@/lib/convocatoria-evaluacion-filtros";
import { rutaFichaPublica } from "@/lib/ficha-publica";
import { etiquetaNombreCaso } from "@/lib/nombre-caso";

export type FilaExcelLink = PostulacionFiltroItem & {
  tokenPublico?: string | null;
};

export function urlFichaPublica(postulacion: FilaExcelLink, origen: string) {
  if (!postulacion.tokenPublico) return "";
  return `${origen}${rutaFichaPublica(postulacion.tokenPublico)}`;
}

export function filasExcelLinks(
  filas: FilaExcelLink[],
  origen: string,
  preguntas: PreguntaFiltro[],
) {
  return [
    ["Nombre del caso", "Participante", "Correo", "Estado", "Link"],
    ...filas.map((postulacion) => [
      etiquetaNombreCaso(postulacion.nombreCaso),
      postulacion.emprendedorNombre,
      normalizarCorreo(postulacion.emprendedorEmail),
      etiquetaEstadoRespuestaFicha(estadoRespuestaFicha(postulacion, preguntas)),
      urlFichaPublica(postulacion, origen),
    ]),
  ];
}
