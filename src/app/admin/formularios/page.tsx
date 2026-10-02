import { prisma } from "@/lib/db";
import { MODO_EVALUACION_LABEL, parseModoEvaluacion } from "@/lib/modo-evaluacion";
import { esMentoriaContenido, TIPO_FORMULARIO_LABEL, parseTipoFormulario } from "@/lib/tipo-formulario";

export default async function FormulariosPage() {
  const formularios = await prisma.formulario.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { preguntas: true, convocatorias: true, piezasContenido: true } } },
  });

  return (
    <div className="page-scroll h-full space-y-8 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-navy">Formularios</h1>
        <a className="btn btn-sm btn-primary" href="/admin/formularios/nuevo" data-tour="formularios-nuevo">
          Crear nuevo formulario
        </a>
      </div>

      <div className="space-y-3" data-tour="formularios-lista">
        {formularios.length === 0 ? <p className="text-muted">Aún no hay formularios.</p> : null}
        {formularios.map((form) => {
          const tipo = parseTipoFormulario(form.tipo);
          const contenido = esMentoriaContenido(tipo);
          const modo = parseModoEvaluacion(form.modoEvaluacion);
          const detalle = contenido
            ? `${form._count.piezasContenido} casillas`
            : `${MODO_EVALUACION_LABEL[modo]} · ${form._count.preguntas} preguntas`;
          return (
            <a key={form.id} href={`/admin/formularios/${form.id}`} className="card block p-5">
              <h2 className="text-xl font-semibold">{form.titulo}</h2>
              <p className="text-muted">
                {TIPO_FORMULARIO_LABEL[tipo]} · {detalle} ·{" "}
                {form._count.convocatorias === 1 ? "1 asesoría" : `${form._count.convocatorias} asesorías`}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
