-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- AlterTable
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "nombreCaso" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "Postulacion_postulanteId_idx" ON "Postulacion"("postulanteId");

CREATE INDEX IF NOT EXISTS "Convocatoria_estado_idx" ON "Convocatoria"("estado");
CREATE INDEX IF NOT EXISTS "Convocatoria_formularioId_idx" ON "Convocatoria"("formularioId");
CREATE INDEX IF NOT EXISTS "Pregunta_formularioId_idx" ON "Pregunta"("formularioId");
CREATE INDEX IF NOT EXISTS "Respuesta_postulacionId_idx" ON "Respuesta"("postulacionId");
CREATE INDEX IF NOT EXISTS "RespuestaVersion_respuestaId_idx" ON "RespuestaVersion"("respuestaId");
CREATE INDEX IF NOT EXISTS "AsignacionEvaluador_evaluadorId_idx" ON "AsignacionEvaluador"("evaluadorId");
CREATE INDEX IF NOT EXISTS "AsignacionSupervisor_supervisorId_idx" ON "AsignacionSupervisor"("supervisorId");
