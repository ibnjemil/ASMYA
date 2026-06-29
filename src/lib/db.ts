import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.ASMYA_DB_URL || process.env.DATABASE_URL || ''

  if (dbUrl.startsWith('libsql://')) {
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl
    const { LibSQL } = require('@prisma/adapter-libsql')
    const adapter = new LibSQL({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (!globalForPrisma.prisma) globalForPrisma.prisma = db