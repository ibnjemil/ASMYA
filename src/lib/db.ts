import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const dbUrl = process.env.ASMYA_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("No database URL configured. Set ASMYA_DB_URL or DATABASE_URL.");

  const libsql = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();
if (!globalForPrisma.prisma) globalForPrisma.prisma = db;
