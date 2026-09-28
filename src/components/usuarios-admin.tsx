"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarUsuario,
  cargarUsuariosMasivo,
  crearUsuario,
  eliminarUsuario,
} from "@/actions/usuarios";
import { IndicadorGuardando } from "@/components/indicador-guardando";
import { Modal } from "@/components/modal";
import { InputCorreo } from "@/components/input-correo";
import { normalizarCorreo } from "@/lib/correo";
import {
  PerfilesParticipantesAdmin,
  type PerfilParticipanteRow,
} from "@/components/perfiles-participantes-admin";
import { ESCUELAS } from "@/lib/escuelas";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS, esRolCatalogoEvaluador } from "@/lib/roles";
import { USER_ORIGEN, type UserOrigen } from "@/lib/user-origen";
import { errorDeResultado, useDatoOptimista } from "@/lib/use-dato-optimista";
import { PLANTILLA_USUARIOS_CSV } from "@/lib/usuarios-csv";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  escuela: string | null;
  origen: string;
};

type ImportResult = {
  creados: number;
  omitidos: { linea: number; mensaje: string }[];
};

type ModalActivo = "crear" | "carga" | "editar" | null;
type Filtro =
  | { kind: "todos" }
  | { kind: "origen"; value: UserOrigen }
  | { kind: "rol"; value: Role };

const FILTROS_ROL: { id: Role; roles: Role[] }[] = [
  { id: "EMPRENDEDOR", roles: ["EMPRENDEDOR"] },
  { id: "EVALUADOR", roles: ["EVALUADOR"] },
  { id: "SUPERVISOR", roles: ["SUPERVISOR"] },
  { id: "ADMIN", roles: ["ADMIN"] },
];

function EscuelaSelect({
  id,
  name,
  value,
  required,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Escuela</label>
      <select
        className="input"
        id={id}
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{required ? "Selecciona una escuela" : "Sin escuela"}</option>
        {ESCUELAS.map((escuela) => (
          <option key={escuela} value={escuela}>
            {escuela}
          </option>
        ))}
      </select>
    </div>
  );
}

export function UsuariosAdmin({
  users,
  perfiles,
}: {
  users: UserRow[];
  perfiles: PerfilParticipanteRow[];
}) {
  const router = useRouter();
  const lista = useDatoOptimista(users);
  const filas = lista.dato;
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"usuarios" | "perfiles">("usuarios");
  const [passwordOnce, setPasswordOnce] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [modal, setModal] = useState<ModalActivo>(null);
  const [filtro, setFiltro] = useState<Filtro>({ kind: "todos" });
  const [crearRole, setCrearRole] = useState<Role>("EMPRENDEDOR");
  const [crearEscuela, setCrearEscuela] = useState("");
  const [editRole, setEditRole] = useState<Role>("EMPRENDEDOR");
  const [editEscuela, setEditEscuela] = useState("");

  const visibles = useMemo(() => {
    if (filtro.kind === "todos") return filas;
    if (filtro.kind === "origen") {
      return filas.filter((user) => user.origen === filtro.value);
    }
    const grupo = FILTROS_ROL.find((item) => item.id === filtro.value);
    const roles = grupo?.roles ?? [filtro.value];
    return filas.filter((user) => roles.includes(user.role as Role));
  }, [filas, filtro]);

  const conteoOrigenAdmin = filas.filter((u) => u.origen === USER_ORIGEN.ADMIN).length;
  const conteoRegistro = filas.filter((u) => u.origen === USER_ORIGEN.REGISTRO).length;
  const conteoPorRol = useMemo(() => {
    const counts = Object.fromEntries(FILTROS_ROL.map((item) => [item.id, 0])) as Record<Role, number>;
    for (const user of filas) {
      const grupo = FILTROS_ROL.find((item) => item.roles.includes(user.role as Role));
      if (grupo) counts[grupo.id] += 1;
    }
    return counts;
  }, [filas]);

  function abrirCrear() {
    setError(null);
    setEditingUser(null);
    setCrearRole("EMPRENDEDOR");
    setCrearEscuela("");
    setModal("crear");
  }

  function abrirCarga() {
    setError(null);
    setImportResult(null);
    setEditingUser(null);
    setModal("carga");
  }

  function abrirEditar(user: UserRow) {
    setError(null);
    setEditingUser(user);
    setEditRole(user.role as Role);
    setEditEscuela(user.escuela ?? "");
    setModal("editar");
  }

  function cerrarModal() {
    if (importing) return;
    setModal(null);
    setEditingUser(null);
    setError(null);
  }

  function onEliminar() {
    if (!editingUser) return;
    const confirmar = window.confirm(
      `¿Eliminar a ${editingUser.name} (${normalizarCorreo(editingUser.email)})?\n\nSe borrarán sus participaciones, asignaciones y tokens de recuperación asociados. Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;
    const id = editingUser.id;
    const formData = new FormData();
    formData.set("id", id);
    setModal(null);
    setEditingUser(null);
    setError(null);
    void lista
      .aplicar(
        (prev) => prev.filter((user) => user.id !== id),
        () => eliminarUsuario(formData),
      )
      .then((result) => {
        if (!errorDeResultado(result)) router.refresh();
      });
  }

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA_USUARIOS_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-usuarios.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-workspace grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden">
        <div className="shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-extrabold text-navy">Usuarios</h1>
            <div className="flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${vista === "perfiles" ? "btn-navy" : "btn-secondary"}`}
                type="button"
                onClick={() => setVista((actual) => (actual === "perfiles" ? "usuarios" : "perfiles"))}
              >
                Perfil de Participantes
              </button>
              <button className="btn btn-sm btn-secondary" type="button" onClick={abrirCarga}>
                Carga masiva
              </button>
              <button className="btn btn-sm btn-primary" type="button" onClick={abrirCrear} data-tour="usuarios-crear">
                Crear usuario
              </button>
            </div>
          </div>
          <IndicadorGuardando visible={lista.guardando} />
          {lista.error ? <p className="text-danger">{lista.error}</p> : null}

          {vista === "usuarios" ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar usuarios" data-tour="usuarios-filtros">
            <button
              type="button"
              className={`btn btn-sm ${filtro.kind === "todos" ? "btn-navy" : "btn-secondary"}`}
              onClick={() => setFiltro({ kind: "todos" })}
            >
              Todos ({filas.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                filtro.kind === "origen" && filtro.value === USER_ORIGEN.ADMIN
                  ? "btn-navy"
                  : "btn-secondary"
              }`}
              onClick={() => setFiltro({ kind: "origen", value: USER_ORIGEN.ADMIN })}
            >
              Creados por admin ({conteoOrigenAdmin})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                filtro.kind === "origen" && filtro.value === USER_ORIGEN.REGISTRO
                  ? "btn-navy"
                  : "btn-secondary"
              }`}
              onClick={() => setFiltro({ kind: "origen", value: USER_ORIGEN.REGISTRO })}
            >
              Registro propio ({conteoRegistro})
            </button>
            {FILTROS_ROL.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn btn-sm ${
                  filtro.kind === "rol" && filtro.value === item.id ? "btn-navy" : "btn-secondary"
                }`}
                onClick={() => setFiltro({ kind: "rol", value: item.id })}
              >
                {ROLE_LABELS[item.id]} ({conteoPorRol[item.id]})
              </button>
            ))}
          </div>
          ) : null}

          {error && modal === null ? <p className="text-danger">{error}</p> : null}
          {passwordOnce ? (
            <p className="rounded-lg bg-navy-soft p-3 text-sm">
              Contraseña para copiar ahora (no se vuelve a mostrar):{" "}
              <span className="font-mono font-bold">{passwordOnce}</span>
            </p>
          ) : null}
        </div>

        {vista === "perfiles" ? (
          <PerfilesParticipantesAdmin perfiles={perfiles} />
        ) : (
        <div className="card min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" data-tour="usuarios-tabla">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-border">
                <th className="whitespace-nowrap px-5 py-3.5">Nombre</th>
                <th className="whitespace-nowrap px-5 py-3.5">Correo</th>
                <th className="whitespace-nowrap px-5 py-3.5">Rol</th>
                <th className="whitespace-nowrap px-5 py-3.5">Escuela</th>
                <th className="whitespace-nowrap px-5 py-3.5">Origen</th>
                <th className="whitespace-nowrap px-5 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                    <td className="px-5 py-6 text-muted" colSpan={6}>
                    No hay usuarios en este filtro.
                  </td>
                </tr>
              ) : null}
              {visibles.map((user) => (
                <tr key={user.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-5 py-3.5">{user.name}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">{normalizarCorreo(user.email)}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">{ROLE_LABELS[user.role as Role] ?? user.role}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">{user.escuela ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {user.origen === USER_ORIGEN.REGISTRO ? "Registro propio" : "Admin"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <button className="btn btn-ghost" type="button" onClick={() => abrirEditar(user)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <Modal open={modal === "crear"} title="Crear usuario" onClose={cerrarModal}>
        {error ? <p className="text-danger">{error}</p> : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          action={(formData) => {
            const name = String(formData.get("name") ?? "").trim();
            const email = normalizarCorreo(String(formData.get("email") ?? ""));
            const role = String(formData.get("role") ?? crearRole);
            const escuelaRaw = String(formData.get("escuela") ?? crearEscuela).trim();
            const tempId = `tmp-${crypto.randomUUID()}`;
            setModal(null);
            setError(null);
            void lista
              .aplicar(
                (prev) => [
                  ...prev,
                  {
                    id: tempId,
                    name,
                    email,
                    role,
                    escuela: esRolCatalogoEvaluador(role as Role) ? escuelaRaw || null : null,
                    origen: USER_ORIGEN.ADMIN,
                  },
                ],
                () => crearUsuario(formData),
              )
              .then((result) => {
                if (errorDeResultado(result)) return;
                setPasswordOnce(
                  result && "passwordOnce" in result && result.passwordOnce ? result.passwordOnce : null,
                );
                router.refresh();
              });
          }}
        >
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <InputCorreo className="input" id="email" name="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input className="input" id="password" name="password" required />
          </div>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <select
              className="input"
              id="role"
              name="role"
              value={crearRole}
              onChange={(event) => {
                const next = event.target.value as Role;
                setCrearRole(next);
                if (!esRolCatalogoEvaluador(next)) setCrearEscuela("");
              }}
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          {esRolCatalogoEvaluador(crearRole) ? (
            <div className="md:col-span-2">
              <EscuelaSelect
                id="escuela"
                name="escuela"
                value={crearEscuela}
                required
                onChange={setCrearEscuela}
              />
            </div>
          ) : null}
          <button className="btn btn-primary md:col-span-2" type="submit">
            Guardar usuario
          </button>
        </form>
      </Modal>

      <Modal
        open={modal === "editar" && editingUser !== null}
        title="Editar usuario"
        onClose={cerrarModal}
      >
        {error ? <p className="text-danger">{error}</p> : null}
        {editingUser ? (
          <form
            key={editingUser.id}
            className="grid gap-4 md:grid-cols-2"
            action={(formData) => {
              const id = editingUser.id;
              const name = String(formData.get("name") ?? "").trim();
              const email = normalizarCorreo(String(formData.get("email") ?? ""));
              const role = String(formData.get("role") ?? editRole);
              const escuelaRaw = String(formData.get("escuela") ?? editEscuela).trim();
              const passwordOnce =
                String(formData.get("password") ?? "") || null;
              setModal(null);
              setEditingUser(null);
              setError(null);
              void lista
                .aplicar(
                  (prev) =>
                    prev.map((user) =>
                      user.id === id
                        ? {
                            ...user,
                            name,
                            email,
                            role,
                            escuela: esRolCatalogoEvaluador(role as Role) ? escuelaRaw || null : null,
                          }
                        : user,
                    ),
                  () => actualizarUsuario(formData),
                )
                .then((result) => {
                  if (errorDeResultado(result)) return;
                  setPasswordOnce(
                    result && "passwordOnce" in result && result.passwordOnce
                      ? result.passwordOnce
                      : passwordOnce,
                  );
                  router.refresh();
                });
            }}
          >
            <input type="hidden" name="id" value={editingUser.id} />
            <div className="field">
              <label htmlFor="edit-name">Nombre</label>
              <input
                className="input"
                id="edit-name"
                name="name"
                defaultValue={editingUser.name}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-email">Correo</label>
              <InputCorreo
                className="input"
                id="edit-email"
                name="email"
                defaultValue={editingUser.email}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-password">Nueva contraseña (opcional)</label>
              <input className="input" id="edit-password" name="password" />
            </div>
            <div className="field">
              <label htmlFor="edit-role">Rol</label>
              <select
                className="input"
                id="edit-role"
                name="role"
                value={editRole}
                onChange={(event) => {
                  const next = event.target.value as Role;
                  setEditRole(next);
                  if (!esRolCatalogoEvaluador(next)) setEditEscuela("");
                }}
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            {esRolCatalogoEvaluador(editRole) ? (
              <div className="md:col-span-2">
                <EscuelaSelect
                  id="edit-escuela"
                  name="escuela"
                  value={editEscuela}
                  onChange={setEditEscuela}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <button className="btn btn-primary" type="submit">
                Guardar cambios
              </button>
              <button
                className="btn btn-ghost text-danger"
                type="button"
                onClick={() => void onEliminar()}
              >
                Eliminar usuario
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal open={modal === "carga"} title="Carga masiva" onClose={cerrarModal}>
        {error ? <p className="text-danger">{error}</p> : null}
        <form
          className="grid gap-4"
          action={async (formData) => {
            setImporting(true);
            setImportResult(null);
            const result = await cargarUsuariosMasivo(formData);
            setImporting(false);
            if (result?.error && !result.omitidos) {
              setError(result.error);
              return;
            }
            setError(result?.error ?? null);
            setImportResult({
              creados: result?.creados ?? 0,
              omitidos: result?.omitidos ?? [],
            });
          }}
        >
          <p className="text-muted">
            Sube un CSV con columnas nombre, correo, contraseña, rol y escuela. No se pueden crear
            usuarios Administración. La escuela es obligatoria para Evaluador y Supervisor.
          </p>
          <button className="btn btn-secondary w-fit" type="button" onClick={descargarPlantilla}>
            Descargar plantilla
          </button>
          <div className="field">
            <label htmlFor="file">Archivo CSV</label>
            <input className="input" id="file" name="file" type="file" accept=".csv,text/csv" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={importing}>
            {importing ? "Cargando usuarios…" : "Cargar listado"}
          </button>
          {importResult ? (
            <div className="space-y-2">
              <p>
                Se crearon <strong>{importResult.creados}</strong>{" "}
                {importResult.creados === 1 ? "usuario" : "usuarios"}
                {importResult.omitidos.length > 0
                  ? ` y se omitió${importResult.omitidos.length === 1 ? "" : "ron"} ${importResult.omitidos.length} ${
                      importResult.omitidos.length === 1 ? "fila" : "filas"
                    }.`
                  : "."}
              </p>
              {importResult.omitidos.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-danger">
                  {importResult.omitidos.slice(0, 20).map((item) => (
                    <li key={`${item.linea}-${item.mensaje}`}>
                      Fila {item.linea}: {item.mensaje}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
