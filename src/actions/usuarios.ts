"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { isStoredFile, parseArchivos } from "@/lib/preguntas";
import { requireUser } from "@/lib/session";
import { esRolCatalogoEvaluador } from "@/lib/roles";
import { isEscuela, parseEscuelaInput } from "@/lib/escuelas";
import { deleteUpload } from "@/lib/storage";
import { parseUsuariosCsv } from "@/lib/usuarios-csv";
import { usuarioAltaSchema, usuarioEditarSchema } from "@/lib/validation";

function resolveEscuelaParaRol(
  role: string,
  raw: string | null | undefined,
  { required }: { required: boolean },
): { escuela: string | null; error?: string } {
  const escuela = parseEscuelaInput(raw);

  if (!esRolCatalogoEvaluador(role)) {
    return { escuela: null };
  }

  if (!escuela) {
    if (required) {
      return { escuela: null, error: "La escuela es obligatoria para evaluadores y supervisores." };
    }
    return { escuela: null };
  }

  if (!isEscuela(escuela)) {
    return { escuela: null, error: "Selecciona una escuela válida del catálogo." };
  }

  return { escuela };
}

export async function crearUsuario(formData: FormData) {
  await requireUser("ADMIN");
  const parsed = usuarioAltaSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Completa nombre, correo, contraseña y rol." };
  }
  const { name, email, password, role } = parsed.data;
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const { escuela, error: escuelaError } = resolveEscuelaParaRol(role, formData.get("escuela")?.toString(), {
    required: true,
  });
  if (escuelaError) return { error: escuelaError };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Ya existe un usuario con ese correo." };

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      passwordAssigned: "",
      passwordChangedAt: new Date(),
      role,
      escuela,
      origen: "ADMIN",
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, passwordOnce: password };
}

export async function actualizarUsuario(formData: FormData) {
  await requireUser("ADMIN");
  const parsed = usuarioEditarSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Datos incompletos." };
  }
  const { id, name, email, password, role } = parsed.data;

  const { escuela, error: escuelaError } = resolveEscuelaParaRol(role, formData.get("escuela")?.toString(), {
    required: false,
  });
  if (escuelaError) return { error: escuelaError };

  const actual = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!actual) return { error: "Usuario no encontrado." };

  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) return { error: passwordError };
  }

  const data: {
    name: string;
    email: string;
    role: string;
    escuela: string | null;
    passwordHash?: string;
    passwordAssigned?: string;
    passwordChangedAt?: Date;
  } = { name, email, role, escuela };

  if (password) {
    data.passwordHash = await hashPassword(password);
    data.passwordAssigned = "";
    data.passwordChangedAt = new Date();
  }
  if (role !== actual.role) {
    data.passwordChangedAt = new Date();
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/admin/usuarios");
  return password ? { ok: true, passwordOnce: password } : { ok: true };
}

export async function eliminarUsuario(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Datos incompletos." };
  if (id === admin.id) return { error: "No puedes eliminar tu propia cuenta." };

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { formulariosCreados: true } },
      postulaciones: {
        include: {
          respuestas: { include: { versiones: true } },
        },
      },
    },
  });
  if (!user) return { error: "Usuario no encontrado." };

  if (user._count.formulariosCreados > 0) {
    return {
      error:
        "No se puede eliminar: este usuario creó formularios. Reasigna o elimina esos formularios primero.",
    };
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "No se puede eliminar el único administrador." };
    }
  }

  const adjuntos = new Set<string>();
  for (const archivo of parseArchivos(user.documentosFormalizacion).filter(isStoredFile)) {
    adjuntos.add(archivo.relativePath);
  }
  for (const postulacion of user.postulaciones) {
    for (const respuesta of postulacion.respuestas) {
      for (const archivo of parseArchivos(respuesta.archivos).filter(isStoredFile)) {
        adjuntos.add(archivo.relativePath);
      }
      for (const version of respuesta.versiones) {
        for (const archivo of parseArchivos(version.archivos).filter(isStoredFile)) {
          adjuntos.add(archivo.relativePath);
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (user.postulaciones.length > 0) {
      await tx.postulacion.deleteMany({ where: { postulanteId: id } });
    }
    await tx.asignacionEvaluador.deleteMany({ where: { evaluadorId: id } });
    await tx.convocatoriaEvaluador.deleteMany({ where: { evaluadorId: id } });
    await tx.asignacionSupervisor.deleteMany({ where: { supervisorId: id } });
    await tx.convocatoriaSupervisor.deleteMany({ where: { supervisorId: id } });
    await tx.user.delete({ where: { id } });
  });

  for (const relativePath of adjuntos) {
    try {
      await deleteUpload(relativePath);
    } catch {
      /* el registro ya se eliminó; no bloquear por un archivo huérfano */
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  revalidatePath("/evaluador");
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
      passwordAssigned: "",
      passwordChangedAt: new Date(),
      role: usuario.role,
      escuela: usuario.escuela,
      origen: "ADMIN",
    })),
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, creados: aCrear.length, omitidos };
}
