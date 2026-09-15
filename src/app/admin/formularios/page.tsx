import { prisma } from "@/lib/db";

export default async function FormulariosPage() {
  const formularios = await prisma.formulario.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { preguntas: true, convocatorias: true } } },
  });

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-navy">Formularios</h1>
        <a className="btn btn-sm btn-primary" href="/admin/formularios/nuevo">
          Crear nuevo formulario
        </a>
      </div>

      <div className="space-y-3">
        {formularios.length === 0 ? <p className="text-muted">Aún no hay formularios.</p> : null}
        {formularios.map((form) => (
          <a key={form.id} href={`/admin/formularios/${form.id}`} className="card block p-5">
            <h2 className="text-xl font-semibold">{form.titulo}</h2>
            <p className="text-muted">
              {form._count.preguntas} preguntas · {form._count.convocatorias} convocatorias
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
