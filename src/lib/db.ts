let _db: any
function createDb() {
  const url = process.env.ASMYA_DB_URL
  if (url) process.env.DATABASE_URL = url
  const { PrismaClient } = require('@prisma/client')
  const { createClient } = require('@libsql/client')
  const { PrismaLibSQL } = require('@prisma/adapter-libsql')
  const libsql = createClient({ url })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}
function getDb() {
  if (!_db) _db = createDb()
  return _db
}
export const db = new Proxy({} as any, {
  get(_, prop) { return (getDb())[prop] }
})
