import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.ASMYA_DB_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
})

function toTable(m: string) { return m.charAt(0).toUpperCase() + m.slice(1) }

function whereClause(w: Record<string, any>): [string, any[]] {
  if (!w) return ['', []]
  const conds: string[] = [], params: any[] = []
  for (const [k, v] of Object.entries(w)) {
    if (v !== undefined && v !== null) {
      conds.push('"' + k + '" = ?')
      params.push(v)
    }
  }
  return conds.length ? ['WHERE ' + conds.join(' AND '), params] : ['', []]
}

function modelProxy(name: string) {
  const t = toTable(name)
  return new Proxy({} as any, {
    get(_, method: string) {
      return async (args?: any) => {
        if (method === 'findUnique' || method === 'findFirst') {
          const [ws, wp] = whereClause(args?.where)
          const r = await client.execute('SELECT * FROM "' + t + '" ' + ws + ' LIMIT 1', wp)
          return r.rows[0] || null
        }
        if (method === 'findFirstOrThrow') {
          const [ws, wp] = whereClause(args?.where)
          const r = await client.execute('SELECT * FROM "' + t + '" ' + ws + ' LIMIT 1', wp)
          if (!r.rows[0]) throw new Error('Not found')
          return r.rows[0]
        }
        if (method === 'findMany') {
          const [ws, wp] = whereClause(args?.where)
          let q = 'SELECT * FROM "' + t + '" ' + ws
          if (args?.orderBy) {
            for (const [k, d] of Object.entries(args.orderBy))
              q += ' ORDER BY "' + k + '" ' + (d === 'desc' ? 'DESC' : 'ASC')
          }
          if (args?.take) q += ' LIMIT ' + args.take
          if (args?.skip) q += ' OFFSET ' + args.skip
          return (await client.execute(q, wp)).rows
        }
        if (method === 'create') {
          const d = args?.data || {}
          const ks = Object.keys(d), vs = Object.values(d)
          const cols = ks.map(k => '"' + k + '"').join(',')
          const ph = ks.map(() => '?').join(',')
          await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          return { ...d }
        }
        if (method === 'update') {
          const d = args?.data || {}
          const [ws, wp] = whereClause(args?.where)
          const sp: string[] = [], sv: any[] = []
          for (const [k, v] of Object.entries(d)) { sp.push('"' + k + '" = ?'); sv.push(v) }
          await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
          return d
        }
        if (method === 'updateMany') {
          const d = args?.data || {}
          const [ws, wp] = whereClause(args?.where)
          const sp: string[] = [], sv: any[] = []
          for (const [k, v] of Object.entries(d)) { sp.push('"' + k + '" = ?'); sv.push(v) }
          await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
          return { count: 0 }
        }
        if (method === 'delete' || method === 'deleteMany') {
          const [ws, wp] = whereClause(args?.where)
          await client.execute('DELETE FROM "' + t + '" ' + ws, wp)
          return method === 'deleteMany' ? { count: 0 } : {}
        }
        if (method === 'count') {
          const [ws, wp] = whereClause(args?.where)
          const r = await client.execute('SELECT COUNT(*) as c FROM "' + t + '" ' + ws, wp)
          return Number(r.rows[0]?.c || 0)
        }
        if (method === 'upsert') {
          const d = args?.create || args?.update || {}
          const [ws, wp] = whereClause(args?.where)
          const existing = await client.execute('SELECT id FROM "' + t + '" ' + ws + ' LIMIT 1', wp)
          if (existing.rows.length > 0) {
            const sp: string[] = [], sv: any[] = []
            for (const [k, v] of Object.entries(d)) { sp.push('"' + k + '" = ?'); sv.push(v) }
            await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
            return existing.rows[0]
          }
          const ks = Object.keys(d), vs = Object.values(d)
          const cols = ks.map(k => '"' + k + '"').join(',')
          const ph = ks.map(() => '?').join(',')
          await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          return { ...d }
        }
        if (method === 'createMany') {
          const items = args?.data || []
          for (const d of items) {
            const ks = Object.keys(d), vs = Object.values(d)
            const cols = ks.map(k => '"' + k + '"').join(',')
            const ph = ks.map(() => '?').join(',')
            await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          }
          return { count: items.length }
        }
        throw new Error('db.' + name + '.' + method + ' not implemented')
      }
    }
  })
}

export const db = new Proxy({} as any, {
  get(_, model: string) { return modelProxy(model) }
})
