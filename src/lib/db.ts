import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(process.env.TURSO_AUTH_TOKEN ? {
      datasourceUrl: process.env.DATABASE_URL + '?authToken=' + process.env.TURSO_AUTH_TOKEN,
    } : {}),
  })

if (!globalForPrisma.prisma) globalForPrisma.prisma = db