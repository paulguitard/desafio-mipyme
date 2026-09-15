import type { Role } from "@/lib/roles";
import { ROLE_LABELS, loginPathForRole } from "@/lib/roles";

export default async function AccesoDenegadoPage({
  searchParams,
}: {
  searchParams: Promise<{ esperaba?: string; login?: string }>;
}) {
  const params = await searchParams;
  const esperaba = (params.esperaba as Role) || "EMPRENDEDOR";
  const login = params.login || loginPathForRole(esperaba);

  return (
    <div className="hero-aiep min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
        <div className="card space-y-4 p-8">
          <h1 className="text-3xl font-extrabold text-navy">Acceso no permitido</h1>
          <p>
            Esta sección es solo para <strong>{ROLE_LABELS[esperaba] ?? esperaba}</strong>. Tu usuario tiene
            otro rol. Ingresa por la puerta correcta.
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="btn btn-primary" href={login}>
              Ir al ingreso correcto
            </a>
            <a className="btn btn-secondary" href="/">
              Volver al inicio
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
