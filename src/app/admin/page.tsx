import { prisma } from "@/lib/db";

export default async function AdminHomePage() {
  const [usuariosPorRol, formulariosCount, convocatoriasPorEstado] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.formulario.count(),
    prisma.convocatoria.groupBy({
      by: ["estado"],
      _count: { _all: true },
    }),
  ]);

  const countByRole = Object.fromEntries(
    usuariosPorRol.map((row) => [row.role, row._count._all]),
  ) as Record<string, number>;

  const countByEstado = Object.fromEntries(
    convocatoriasPorEstado.map((row) => [row.estado, row._count._all]),
  ) as Record<string, number>;

  const administradores = countByRole.ADMIN ?? 0;
  const evaluadores = countByRole.EVALUADOR ?? 0;
  const emprendedores = countByRole.EMPRENDEDOR ?? 0;
  const abiertas = countByEstado.ABIERTA ?? 0;
  const cerradas = countByEstado.CERRADA ?? 0;

  return (
    <div className="page-scroll h-full space-y-6 overflow-y-auto">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Administración</p>
        <h1 className="text-3xl font-extrabold text-navy">Configuración</h1>
      </div>
      <p className="max-w-2xl text-muted">
        Crea usuarios, formularios y convocatorias. Configura el pool de evaluadores y asígnalos a cada caso.
      </p>
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        <a className="card card-link flex h-full flex-col p-6" href="/admin/usuarios">
          <h2 className="text-2xl font-bold text-navy">Usuarios</h2>
          <p className="mt-2 text-muted">Alta de administradores, evaluadores y emprendedores.</p>
          <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-4">
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">Admin.</dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{administradores}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">Evaluadores</dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{evaluadores}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">Emprendedores</dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{emprendedores}</dd>
            </div>
          </dl>
        </a>
        <a className="card card-link flex h-full flex-col p-6" href="/admin/formularios">
          <h2 className="text-2xl font-bold text-navy">Formularios</h2>
          <p className="mt-2 text-muted">Preguntas que responderán los emprendedores.</p>
          <dl className="mt-auto border-t border-[var(--border)] pt-4">
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">
                {formulariosCount === 1 ? "Creado" : "Creados"}
              </dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{formulariosCount}</dd>
            </div>
          </dl>
        </a>
        <a className="card card-link flex h-full flex-col p-6" href="/admin/convocatorias">
          <h2 className="text-2xl font-bold text-navy">Convocatorias</h2>
          <p className="mt-2 text-muted">Abrir, cerrar y asignar evaluadores.</p>
          <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">Abiertas</dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{abiertas}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="min-h-8 text-xs font-semibold uppercase tracking-wide text-muted">Cerradas</dt>
              <dd className="mt-1 text-2xl font-extrabold leading-none text-navy">{cerradas}</dd>
            </div>
          </dl>
        </a>
      </div>
    </div>
  );
}
