"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireUser } from "@/lib/session";
import { isRole } from "@/lib/roles";
import { parseUsuariosCsv } from "@/lib/usuarios-csv";

export async function crearUsuario(formData: FormData) {
  await requireUser("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !email || !password || !isRole(role)) {
    return { error: "Completa nombre, correo, contraseña y rol." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ya existe un usuario con ese correo." };

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      passwordAssigned: password,
      role,
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function actualizarUsuario(formData: FormData) {
  await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!id || !name || !email || !isRole(role)) {
    return { error: "Datos incompletos." };
  }

  const data: {
    name: string;
    email: string;
    role: string;
    passwordHash?: string;
    passwordAssigned?: string;
  } = { name, email, role };

  if (password) {
    data.passwordHash = await hashPassword(password);
    data.passwordAssigned = password;
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const MAX_CSV_BYTES = 512 * 1024;
const MAX_USUARIOS = 300;

export async function cargarUsuariosMasivo(formData: FormData) {
  await requireUser("ADMIN");
  const file = formData.get("file");
  const uploaded =
    file && typeof file === "object" && "text" in file && "size" in file
      ? (file as File)
      : null;

  if (!uploaded || uploaded.size === 0) {
    return { error: "Selecciona un archivo CSV." };
  }

  if (uploaded.size > MAX_CSV_BYTES) {
    return { error: "El archivo supera el máximo de 512 KB." };
  }

  const text = await uploaded.text();
  const parsed = parseUsuariosCsv(text);

  if (parsed.usuarios.length === 0) {
    return {
      error: parsed.errores[0]?.mensaje ?? "No hay filas válidas para importar.",
      creados: 0,
      omitidos: parsed.errores,
    };
  }

  if (parsed.usuarios.length > MAX_USUARIOS) {
    return { error: `El archivo tiene más de ${MAX_USUARIOS} usuarios. Divide el listado.` };
  }

  const emails = parsed.usuarios.map((usuario) => usuario.email);
  const existentes = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const existentesSet = new Set(existentes.map((usuario) => usuario.email));

  const omitidos = [...parsed.errores];
  const aCrear = parsed.usuarios.filter((usuario) => {
    if (existentesSet.has(usuario.email)) {
      omitidos.push({ linea: usuario.linea, mensaje: `Ya existe un usuario con el correo ${usuario.email}.` });
      return false;
    }
    return true;
  });

  if (aCrear.length === 0) {
    return { ok: true, creados: 0, omitidos };
  }

  const hashes: string[] = [];
  const batchSize = 8;
  for (let i = 0; i < aCrear.length; i += batchSize) {
    const slice = aCrear.slice(i, i + batchSize);
    hashes.push(...(await Promise.all(slice.map((usuario) => hashPassword(usuario.password)))));
  }

  await prisma.user.createMany({
    data: aCrear.map((usuario, index) => ({
      name: usuario.name,
      email: usuario.email,
      passwordHash: hashes[index],
      passwordAssigned: usuario.password,
      role: usuario.role,
    })),
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, creados: aCrear.length, omitidos };
}
