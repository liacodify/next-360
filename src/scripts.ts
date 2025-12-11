import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function createAdminIfNoneExists() {
  await db.user.deleteMany();
  const count = await db.user.count();

  if (count === 0) {
    // Hashear la contraseña con bcryptjs

    const hashedPassword = await bcrypt.hash("admin", 10);
    await db.user.create({
      data: {
        email: "admin@example.com",
        hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Usuario admin creado porque no existía ninguno");
  } else {
    console.log("Ya existen usuarios, no se crea admin");
  }
}

createAdminIfNoneExists()
  .catch(console.error)
  .finally(() => db.$disconnect());
