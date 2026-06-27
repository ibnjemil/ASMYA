import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const url = process.env.ASMYA_DB_URL
  if (!url) throw new Error('ASMYA_DB_URL is required')
  const libsql = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || '' })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
