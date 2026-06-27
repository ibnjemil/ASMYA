import { PrismaClient } from '@prisma/client'

function createPrisma() {
  const dbUrl = process.env.ASMYA_DB_URL
  if (dbUrl && dbUrl.startsWith('libsql://')) {
    try {
      const { createClient } = require('@libsql/client')
      const { PrismaLibSQL } = require('@prisma/adapter-libsql')
      const libsql = createClient({ url: dbUrl })
      const adapter = new PrismaLibSQL(libsql)
      return new PrismaClient({ adapter })
    } catch (e) {
      console.error('LibSQL adapter failed:', e)
      return new PrismaClient()
    }
  }
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
