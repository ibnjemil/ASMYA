import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!globalForPrisma.prisma) {
  if (process.env.DATABASE_URL?.startsWith('libsql://') && process.env.TURSO_AUTH_TOKEN) {
    try {
      const { LibSQL } = require(/* webpackIgnore: true */ '@prisma/adapter-libsql')
      const adapter = new LibSQL({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      globalForPrisma.prisma = new PrismaClient({ adapter })
    } catch (e) {
      console.error('LibSQL adapter failed, using default:', e)
      globalForPrisma.prisma = new PrismaClient()
    }
  } else {
    globalForPrisma.prisma = new PrismaClient()
  }
}

export const db = globalForPrisma.prisma
