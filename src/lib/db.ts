import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
function createPrismaClient() {
  const url = process.env.ASMYA_DB_URL
  if (!url) throw new Error('ASMYA_DB_URL is required')
  const adapterModule = require('@prisma/adapter-libsql')
  const libsqlModule = require('@libsql/client')
  const libsql = libsqlModule.createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || '' })
  const AdapterClass = adapterModule.PrismaLibSQL || adapterModule.LibSQL
  if (!AdapterClass) throw new Error('No libsql adapter found')
  return new PrismaClient({ adapter: new AdapterClass(libsql) })
}
export const db = globalForPrisma.prisma ?? createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
