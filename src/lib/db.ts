import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | undefined

function createDbClient(): PrismaClient {
  const dbUrl = process.env.ASMYA_DB_URL
  const { createClient } = require('@libsql/client')
  const { PrismaLibSQL } = require('@prisma/adapter-libsql')
  const libsql = createClient({ url: dbUrl })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

function getDb(): PrismaClient {
  if (!_db) {
    _db = createDbClient()
  }
  return _db
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})
