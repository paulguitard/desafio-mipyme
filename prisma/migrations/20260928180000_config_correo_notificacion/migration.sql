-- CreateTable
CREATE TABLE IF NOT EXISTS "ConfigCorreoNotificacion" (
    "id" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "textoBoton" TEXT NOT NULL,
    "pie" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigCorreoNotificacion_pkey" PRIMARY KEY ("id")
);
