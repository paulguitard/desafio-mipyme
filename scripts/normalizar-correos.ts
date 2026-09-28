import { normalizarCorreosPersistidos } from "../src/lib/normalizar-correos-persistidos";
import { prisma } from "../src/lib/db";

async function main() {
  const result = await normalizarCorreosPersistidos();
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
