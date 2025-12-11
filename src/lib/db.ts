import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const db =
  globalThis.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  }); // ✅ ¡Simple y sin parámetros internos!

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

export default db;
