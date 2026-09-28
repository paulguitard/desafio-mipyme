import { z } from "zod";
import { normalizarCorreo } from "@/lib/correo";
import { isRole } from "@/lib/roles";

const correoSchema = z.string().transform(normalizarCorreo).pipe(z.email());

export const loginSchema = z.object({
  email: correoSchema,
  password: z.string().min(1),
  expectedRole: z.string().refine(isRole, "Rol de ingreso inválido."),
});

export const usuarioAltaSchema = z.object({
  name: z.string().trim().min(1),
  email: correoSchema,
  password: z.string().min(1),
  role: z.string().refine(isRole, "Rol inválido."),
});

export const usuarioEditarSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  email: correoSchema,
  password: z.string(),
  role: z.string().refine(isRole, "Rol inválido."),
});
