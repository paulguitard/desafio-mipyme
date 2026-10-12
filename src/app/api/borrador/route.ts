import { persistirBorradorCaso } from "@/lib/borrador-caso";
import {
  persistirBorradorEvaluacion,
  persistirBorradorSupervision,
} from "@/lib/borrador-revision";
import { getActor } from "@/lib/session";

export const runtime = "nodejs";

type KindBorrador = "caso" | "evaluacion" | "supervision";

function esKind(valor: string): valor is KindBorrador {
  return valor === "caso" || valor === "evaluacion" || valor === "supervision";
}

export async function POST(request: Request) {
  const user = await getActor();
  if (!user) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const kindRaw = String(formData.get("kind") ?? "");
  if (!esKind(kindRaw)) {
    return Response.json({ error: "Tipo de borrador no válido." }, { status: 400 });
  }
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim() || null;
  const omitirArchivosNuevos = String(formData.get("omitirArchivosNuevos") ?? "") === "1";

  let resultado;
  if (kindRaw === "caso") {
    if (user.role !== "EMPRENDEDOR") {
      return Response.json({ error: "No autorizado." }, { status: 403 });
    }
    resultado = await persistirBorradorCaso({
      userId: user.id,
      formData,
      expectedUpdatedAt,
      omitirArchivosNuevos,
    });
  } else if (kindRaw === "evaluacion") {
    if (user.role !== "EVALUADOR") {
      return Response.json({ error: "No autorizado." }, { status: 403 });
    }
    resultado = await persistirBorradorEvaluacion({
      userId: user.id,
      formData,
      expectedUpdatedAt,
      cambiarEstado: false,
      permitirSinVeredicto: true,
    });
  } else {
    if (user.role !== "SUPERVISOR") {
      return Response.json({ error: "No autorizado." }, { status: 403 });
    }
    resultado = await persistirBorradorSupervision({
      userId: user.id,
      formData,
      expectedUpdatedAt,
      permitirSinVeredicto: true,
    });
  }

  if ("error" in resultado) {
    return Response.json({ error: resultado.error }, { status: 400 });
  }
  if ("conflict" in resultado) {
    return Response.json(
      { conflict: true, updatedAt: resultado.updatedAt },
      { status: 409 },
    );
  }
  return Response.json({
    ok: true,
    updatedAt: resultado.updatedAt,
    ...("archivoError" in resultado && resultado.archivoError
      ? { archivoError: resultado.archivoError }
      : {}),
  });
}
