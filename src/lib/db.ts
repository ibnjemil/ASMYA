import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!globalForPrisma.prisma) {
  if (process.env.DATABASE_URL?.startsWith('libsql://') && process.env.TURSO_AUTH_TOKEN) {
    try {
      const libsql = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
      const adapter = new PrismaLibSQL(libsql)
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
