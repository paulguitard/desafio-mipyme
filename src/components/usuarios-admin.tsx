"use client";

import { useState } from "react";
import { actualizarUsuario, cargarUsuariosMasivo, crearUsuario } from "@/actions/usuarios";
import { Modal } from "@/components/modal";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";
import { PLANTILLA_USUARIOS_CSV } from "@/lib/usuarios-csv";

type UserRow = {
  id: string;
  name: string;
  email: string;
  passwordAssigned: string;
  role: string;
};

type ImportResult = {
  creados: number;
  omitidos: { linea: number; mensaje: string }[];
};

type ModalActivo = "crear" | "carga" | null;

export function UsuariosAdmin({ users }: { users: UserRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [modal, setModal] = useState<ModalActivo>(null);

  function abrirCrear() {
    setError(null);
    setModal("crear");
  }

  function abrirCarga() {
    setError(null);
    setImportResult(null);
    setModal("carga");
  }

  function cerrarModal() {
    if (importing) return;
    setModal(null);
    setError(null);
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
              <button className="btn btn-sm btn-secondary" type="button" onClick={abrirCarga}>
                Carga masiva
              </button>
              <button className="btn btn-sm btn-primary" type="button" onClick={abrirCrear}>
                Crear usuario
              </button>
            </div>
          </div>
          {error && modal === null ? <p className="text-danger">{error}</p> : null}
        </div>

        <div className="card min-h-0 overflow-auto overscroll-contain">
          <table className="w-full min-w-[720px] text-left">
            <thead className="sticky top-0 z-10 bg-[var(--card)]">
              <tr className="border-b border-border">
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Contraseña</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) =>
                editing === user.id ? (
                  <tr key={user.id} className="border-b border-border align-top">
                    <td colSpan={5} className="p-3">
                      <form
                        className="grid gap-3 md:grid-cols-2"
                        action={async (formData) => {
                          const result = await actualizarUsuario(formData);
                          if (result?.error) setError(result.error);
                          else setEditing(null);
                        }}
                      >
                        <input type="hidden" name="id" value={user.id} />
                        <div className="field">
                          <label>Nombre</label>
                          <input className="input" name="name" defaultValue={user.name} required />
                        </div>
                        <div className="field">
                          <label>Correo</label>
                          <input className="input" name="email" type="email" defaultValue={user.email} required />
                        </div>
                        <div className="field">
                          <label>Nueva contraseña (opcional)</label>
                          <input className="input" name="password" />
                        </div>
                        <div className="field">
                          <label>Rol</label>
                          <select className="input" name="role" defaultValue={user.role}>
                            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 md:col-span-2">
                          <button className="btn btn-primary" type="submit">
                            Guardar cambios
                          </button>
                          <button className="btn btn-secondary" type="button" onClick={() => setEditing(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={user.id} className="border-b border-border">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3 font-mono">{user.passwordAssigned}</td>
                    <td className="p-3">{ROLE_LABELS[user.role as Role] ?? user.role}</td>
                    <td className="p-3">
                      <button className="btn btn-ghost" type="button" onClick={() => setEditing(user.id)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "crear"} title="Crear usuario" onClose={cerrarModal}>
        {error ? <p className="text-danger">{error}</p> : null}
        <form
          className="grid gap-4 md:grid-cols-2"
          action={async (formData) => {
            const result = await crearUsuario(formData);
            if (result?.error) {
              setError(result.error);
              return;
            }
            setError(null);
            setModal(null);
          }}
        >
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input className="input" id="password" name="password" required />
          </div>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <select className="input" id="role" name="role" defaultValue="EMPRENDEDOR">
              {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary md:col-span-2" type="submit">
            Guardar usuario
          </button>
        </form>
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
            Sube un CSV con columnas nombre, correo, contraseña y rol. El rol puede ser Administración,
            Evaluador o Emprendedor.
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
