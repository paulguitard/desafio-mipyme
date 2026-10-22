-- AlterTable
ALTER TABLE "Convocatoria" ADD COLUMN IF NOT EXISTS "evaluadoresHabilitados" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Convocatoria" ADD COLUMN IF NOT EXISTS "supervisoresHabilitados" BOOLEAN NOT NULL DEFAULT true;
