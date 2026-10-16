import "@/lib/env";
import { PrismaClient } from "@prisma/client";
import { ajustarUrlPrisma } from "@/lib/prisma-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: string;
};

/** Subir este valor tras cambios de schema para invalidar el cliente cacheado en `next dev`. */
const PRISMA_SCHEMA_REV = "pool-dev-limit-5";

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: ajustarUrlPrisma(process.env.DATABASE_URL ?? "") },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
}
