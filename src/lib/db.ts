import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { p: PrismaClient | undefined };
export const db = g.p ?? new PrismaClient();
if (!g.p) g.p = db;
if (!g.p) g.p = db;
