import { prisma } from "@/lib/db";
import { parseValor } from "@/lib/preguntas";

export const CLAVE_NOMBRE_CASO = "nombre_caso";
export const ENUNCIADO_NOMBRE_CASO = "Nombre del caso";
export const MAX_CARACTERES_NOMBRE_CASO = 60;
export const NOMBRE_CASO_VACIO = "Sin nombre";

export function opcionesNombreCaso(): string {
  return JSON.stringify({
    maxCaracteres: MAX_CARACTERES_NOMBRE_CASO,
    clave: CLAVE_NOMBRE_CASO,
  });
}

export function esPreguntaNombreCaso(pregunta: { opciones?: string | null }): boolean {
  const raw = pregunta.opciones ?? "";
  if (raw.includes(`"clave":"${CLAVE_NOMBRE_CASO}"`)) return true;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        (parsed as { clave?: unknown }).clave === CLAVE_NOMBRE_CASO,
    );
  } catch {
    return false;
  }
}

export function datosPreguntaNombreCaso() {
  return {
    enunciado: ENUNCIADO_NOMBRE_CASO,
    ayuda: "",
    tipo: "texto_corto" as const,
    opciones: opcionesNombreCaso(),
    obligatoria: true,
    permiteArchivo: false,
    permiteImagen: false,
    permiteVideoLink: false,
    conNotas: false,
    escalaNotas: "[]",
  };
}

export function preguntaNombreCasoVista(id: string) {
  return { id, ...datosPreguntaNombreCaso() };
}

export function extraerNombreCaso(
  preguntas: { id: string; opciones: string }[],
  respuestas: { preguntaId: string; valor: string }[],
): string {
  const pregunta = preguntas.find(esPreguntaNombreCaso);
  if (!pregunta) return "";
  const respuesta = respuestas.find((item) => item.preguntaId === pregunta.id);
  if (!respuesta) return "";
  const parsed = parseValor(respuesta.valor);
  if (parsed == null) return "";
  return String(parsed).trim();
}

export function etiquetaNombreCaso(nombre: string | null | undefined): string {
  const valor = (nombre ?? "").trim();
  return valor || NOMBRE_CASO_VACIO;
}

export async function asegurarPreguntaNombreCaso(formularioId: string) {
  const preguntas = await prisma.pregunta.findMany({
    where: { formularioId },
    orderBy: { orden: "asc" },
  });
  const fija = preguntas.find(esPreguntaNombreCaso);
  const datos = datosPreguntaNombreCaso();

  if (!fija) {
    await prisma.$transaction(async (tx) => {
      if (preguntas.length > 0) {
        await tx.pregunta.updateMany({
          where: { formularioId },
          data: { orden: { increment: 1 } },
        });
      }
      await tx.pregunta.create({
        data: {
          formularioId,
          orden: 1,
          ...datos,
        },
      });
    });
    return;
  }

  const needsUpdate =
    fija.enunciado !== datos.enunciado ||
    fija.tipo !== datos.tipo ||
    fija.opciones !== datos.opciones ||
    !fija.obligatoria ||
    fija.permiteArchivo ||
    fija.permiteImagen ||
    fija.permiteVideoLink ||
    fija.conNotas ||
    fija.escalaNotas !== datos.escalaNotas ||
    fija.ayuda !== datos.ayuda;

  if (needsUpdate) {
    await prisma.pregunta.update({
      where: { id: fija.id },
      data: datos,
    });
  }

  if (preguntas[0]?.id === fija.id) return;

  const otros = preguntas.filter((pregunta) => pregunta.id !== fija.id);
  await prisma.$transaction([
    prisma.pregunta.update({ where: { id: fija.id }, data: { orden: 1 } }),
    ...otros.map((pregunta, index) =>
      prisma.pregunta.update({ where: { id: pregunta.id }, data: { orden: index + 2 } }),
    ),
  ]);
}
