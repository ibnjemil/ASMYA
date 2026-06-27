import { createClient } from '@libsql/client'
const client = createClient({ url: process.env.ASMYA_DB_URL! })
export async function rawQuery(sql: string, args: (string|number|null)[] = []) {
  return (await client.execute({ sql, args })).rows
}
