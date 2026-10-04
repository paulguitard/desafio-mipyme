-- AlterTable
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "tokenPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Postulacion_tokenPublico_key" ON "Postulacion"("tokenPublico");
