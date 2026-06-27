import { PrismaClient } from '@prisma/client'

const dbUrl = process.env.ASMYA_DB_URL
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const libsql = createClient({ url: dbUrl })
const adapter = new PrismaLibSQL(libsql)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
