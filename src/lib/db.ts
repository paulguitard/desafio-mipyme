import "@/lib/env";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaRev?: string;
};

/** Subir este valor tras cambios de schema para invalidar el cliente cacheado en `next dev`. */
const PRISMA_SCHEMA_REV = "permiteVideoLink-2";

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
}
