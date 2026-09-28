import { prisma } from "@/lib/db";
import { normalizarCorreo, normalizarValorCampoCorreo } from "@/lib/correo";
import { parseValor, serializeValor } from "@/lib/preguntas";

function valorCorreoSerializado(raw: string) {
  return serializeValor(normalizarValorCampoCorreo(parseValor(raw)));
}

export async function normalizarCorreosPersistidos() {
  const conflictos: string[] = [];
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const groups = new Map<string, { id: string; email: string }[]>();
  for (const user of users) {
    const key = normalizarCorreo(user.email);
    const list = groups.get(key) ?? [];
    list.push(user);
    groups.set(key, list);
  }

  for (const [email, list] of groups) {
    if (list.length > 1) {
      conflictos.push(email);
      continue;
    }
    const user = list[0];
    if (!user || user.email === email) continue;
    await prisma.user.update({ where: { id: user.id }, data: { email } });
  }

  const respuestas = await prisma.respuesta.findMany({
    where: { pregunta: { tipo: "correo" } },
    select: { id: true, valor: true },
  });
  for (const respuesta of respuestas) {
    const next = valorCorreoSerializado(respuesta.valor);
    if (next !== respuesta.valor) {
      await prisma.respuesta.update({ where: { id: respuesta.id }, data: { valor: next } });
    }
  }

  const versiones = await prisma.respuestaVersion.findMany({
    where: { respuesta: { pregunta: { tipo: "correo" } } },
    select: { id: true, valor: true },
  });
  for (const version of versiones) {
    const next = valorCorreoSerializado(version.valor);
    if (next !== version.valor) {
      await prisma.respuestaVersion.update({ where: { id: version.id }, data: { valor: next } });
    }
  }

  if (conflictos.length) {
    console.warn(
      "[correo] Cuentas con el mismo correo en distinta capitalización; no se fusionaron ni se borraron:",
      conflictos.join(", "),
    );
  }

  return { conflictos };
}
