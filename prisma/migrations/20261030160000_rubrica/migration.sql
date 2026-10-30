-- CreateTable
CREATE TABLE IF NOT EXISTS "Rubrica" (
    "id" TEXT NOT NULL,
    "formularioId" TEXT NOT NULL,
    "escala" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CriterioRubrica" (
    "id" TEXT NOT NULL,
    "rubricaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "preguntaGuia" TEXT NOT NULL,
    "detalle" TEXT NOT NULL DEFAULT '',
    "peso" INTEGER NOT NULL,
    "explicaciones" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "CriterioRubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RevisionCriterio" (
    "id" TEXT NOT NULL,
    "asignacionId" TEXT NOT NULL,
    "criterioId" TEXT NOT NULL,
    "ronda" INTEGER NOT NULL,
    "ciclo" INTEGER NOT NULL DEFAULT 1,
    "nota" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionCriterio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Rubrica_formularioId_key" ON "Rubrica"("formularioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CriterioRubrica_rubricaId_idx" ON "CriterioRubrica"("rubricaId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RevisionCriterio_asignacionId_criterioId_ronda_ciclo_key" ON "RevisionCriterio"("asignacionId", "criterioId", "ronda", "ciclo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RevisionCriterio_criterioId_idx" ON "RevisionCriterio"("criterioId");

-- AddForeignKey
ALTER TABLE "Rubrica" ADD CONSTRAINT "Rubrica_formularioId_fkey" FOREIGN KEY ("formularioId") REFERENCES "Formulario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioRubrica" ADD CONSTRAINT "CriterioRubrica_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "Rubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionCriterio" ADD CONSTRAINT "RevisionCriterio_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "AsignacionEvaluador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionCriterio" ADD CONSTRAINT "RevisionCriterio_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "CriterioRubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;
