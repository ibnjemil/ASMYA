import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

let _db: PrismaClient | undefined;

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_db) {
      const libsql = createClient({
        url: process.env.ASMYA_DB_URL || "",
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      _db = new PrismaClient({ adapter: new PrismaLibSql(libsql) });
    }
    return (_db as any)[prop];
  }
});
