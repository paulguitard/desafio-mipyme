-- CreateTable
CREATE TABLE IF NOT EXISTS "ConfigApp" (
    "id" TEXT NOT NULL,
    "permitirEvaluacionPorPregunta" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigApp_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Formulario" ALTER COLUMN "modoEvaluacion" SET DEFAULT 'GENERAL';
