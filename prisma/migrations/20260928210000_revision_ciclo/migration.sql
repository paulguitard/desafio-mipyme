-- Versionar evaluaciones por ciclo de supervisión (sin borrar filas existentes).
ALTER TABLE "RevisionPregunta" ADD COLUMN IF NOT EXISTS "ciclo" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RevisionGeneral" ADD COLUMN IF NOT EXISTS "ciclo" INTEGER NOT NULL DEFAULT 1;

-- La fila vigente de la ronda actual pasa a coincidir con cicloSupervision.
UPDATE "RevisionPregunta" AS r
SET "ciclo" = a."cicloSupervision"
FROM "AsignacionEvaluador" AS a
WHERE r."asignacionId" = a.id AND r.ronda = a."rondaActual";

UPDATE "RevisionGeneral" AS r
SET "ciclo" = a."cicloSupervision"
FROM "AsignacionEvaluador" AS a
WHERE r."asignacionId" = a.id AND r.ronda = a."rondaActual";

ALTER TABLE "RevisionPregunta" DROP CONSTRAINT IF EXISTS "RevisionPregunta_asignacionId_preguntaId_ronda_key";
ALTER TABLE "RevisionGeneral" DROP CONSTRAINT IF EXISTS "RevisionGeneral_asignacionId_ronda_key";
DROP INDEX IF EXISTS "RevisionPregunta_asignacionId_preguntaId_ronda_key";
DROP INDEX IF EXISTS "RevisionGeneral_asignacionId_ronda_key";

ALTER TABLE "RevisionPregunta" DROP CONSTRAINT IF EXISTS "RevisionPregunta_asignacionId_preguntaId_ronda_ciclo_key";
ALTER TABLE "RevisionGeneral" DROP CONSTRAINT IF EXISTS "RevisionGeneral_asignacionId_ronda_ciclo_key";
ALTER TABLE "RevisionPregunta" ADD CONSTRAINT "RevisionPregunta_asignacionId_preguntaId_ronda_ciclo_key" UNIQUE ("asignacionId", "preguntaId", "ronda", "ciclo");
ALTER TABLE "RevisionGeneral" ADD CONSTRAINT "RevisionGeneral_asignacionId_ronda_ciclo_key" UNIQUE ("asignacionId", "ronda", "ciclo");
