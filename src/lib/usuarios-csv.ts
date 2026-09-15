import { ROLE_LABELS, isRole, type Role } from "@/lib/roles";

export type UsuarioCsv = {
  linea: number;
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type FilaCsvError = {
  linea: number;
  mensaje: string;
};

export type ParseUsuariosCsvResult = {
  usuarios: UsuarioCsv[];
  errores: FilaCsvError[];
};

const HEADER_ALIASES: Record<string, "name" | "email" | "password" | "role"> = {
  nombre: "name",
  name: "name",
  correo: "email",
  email: "email",
  mail: "email",
  contrasena: "password",
  password: "password",
  clave: "password",
  rol: "role",
  role: "role",
};

const ROLE_ALIASES: Record<string, Role> = {
  admin: "ADMIN",
  administrador: "ADMIN",
  administradora: "ADMIN",
  administracion: "ADMIN",
  evaluador: "EVALUADOR",
  evaluadora: "EVALUADOR",
  emprendedor: "EMPRENDEDOR",
  emprendedora: "EMPRENDEDOR",
  postulante: "EMPRENDEDOR",
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function detectDelimiter(headerLine: string) {
  const counts = {
    ",": 0,
    ";": 0,
    "\t": 0,
  };
  let inQuotes = false;
  for (const char of headerLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char in counts) {
      counts[char as keyof typeof counts] += 1;
    }
  }
  const winner = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
  return winner && winner[1] > 0 ? winner[0] : ",";
}

export function parseCsvRows(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => value.trim().length > 0));
}

function resolveRole(value: string): Role | null {
  const trimmed = value.trim();
  if (isRole(trimmed.toUpperCase())) return trimmed.toUpperCase() as Role;
  const folded = fold(trimmed);
  if (ROLE_ALIASES[folded]) return ROLE_ALIASES[folded];
  const byLabel = (Object.keys(ROLE_LABELS) as Role[]).find((role) => fold(ROLE_LABELS[role]) === folded);
  return byLabel ?? null;
}

export function parseUsuariosCsv(text: string): ParseUsuariosCsvResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { usuarios: [], errores: [{ linea: 1, mensaje: "El archivo debe incluir encabezados y al menos una fila." }] };
  }

  const headers = rows[0].map((header) => HEADER_ALIASES[fold(header)] ?? null);
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const passwordIdx = headers.indexOf("password");
  const roleIdx = headers.indexOf("role");

  if (nameIdx < 0 || emailIdx < 0 || passwordIdx < 0 || roleIdx < 0) {
    return {
      usuarios: [],
      errores: [
        {
          linea: 1,
          mensaje: "Faltan columnas. Usa: nombre, correo, contraseña, rol.",
        },
      ],
    };
  }

  const usuarios: UsuarioCsv[] = [];
  const errores: FilaCsvError[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < rows.length; i += 1) {
    const linea = i + 1;
    const cells = rows[i];
    const name = (cells[nameIdx] ?? "").trim();
    const email = (cells[emailIdx] ?? "").trim().toLowerCase();
    const password = (cells[passwordIdx] ?? "").trim();
    const roleRaw = cells[roleIdx] ?? "";
    const role = resolveRole(roleRaw);

    if (!name || !email || !password || !role) {
      errores.push({
        linea,
        mensaje: "Completa nombre, correo, contraseña y un rol válido (Administración, Evaluador o Emprendedor).",
      });
      continue;
    }

    if (!email.includes("@")) {
      errores.push({ linea, mensaje: `Correo inválido: ${email}` });
      continue;
    }

    if (seenEmails.has(email)) {
      errores.push({ linea, mensaje: `Correo duplicado en el archivo: ${email}` });
      continue;
    }

    seenEmails.add(email);
    usuarios.push({ linea, name, email, password, role });
  }

  return { usuarios, errores };
}

export const PLANTILLA_USUARIOS_CSV = [
  "nombre,correo,contraseña,rol",
  "Ana Pérez,ana.perez@ejemplo.com,ClaveSegura1,Emprendedor",
  "Luis Soto,luis.soto@ejemplo.com,ClaveSegura1,Evaluador",
].join("\n");
