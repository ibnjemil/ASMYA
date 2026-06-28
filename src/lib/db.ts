import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const libsql = createClient({
    url: process.env.DATABASE_URL || '',
  })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
