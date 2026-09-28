import { z } from "zod";
import { isRole } from "@/lib/roles";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  expectedRole: z.string().refine(isRole, "Rol de ingreso inválido."),
});

export const usuarioAltaSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  role: z.string().refine(isRole, "Rol inválido."),
});

export const usuarioEditarSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string(),
  role: z.string().refine(isRole, "Rol inválido."),
});
