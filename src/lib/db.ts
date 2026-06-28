import { PrismaClient } from "@prisma/client";
let _db: PrismaClient | undefined;
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_db) _db = new PrismaClient();
    return (_db as any)[prop];
  }
});
