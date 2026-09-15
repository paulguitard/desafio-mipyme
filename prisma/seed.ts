import { hashPassword } from "../src/lib/password";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@test.com";
  const password = "bitacora";
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Administrador",
      passwordHash,
      passwordAssigned: password,
      role: "ADMIN",
    },
    create: {
      name: "Administrador",
      email,
      passwordHash,
      passwordAssigned: password,
      role: "ADMIN",
    },
  });

  console.log("Admin listo: admin@test.com / bitacora");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
