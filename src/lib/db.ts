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
      if (k.endsWith('_in')) {
        const col = k.slice(0, -3)
        const ph = v.map(() => '?').join(',')
        conds.push('"' + col + '" IN (' + ph + ')')
        params.push(...v)
      } else {
        conds.push('"' + k + '" = ?')
        params.push(v)
      }
    }
  }
  return conds.length ? ['WHERE ' + conds.join(' AND '), params] : ['', []]
}

function defaults(d: Record<string,any>) {
  if (!d.id) d.id = crypto.randomUUID()
  const now = new Date().toISOString()
  if (!d.createdAt) d.createdAt = now
  if (!d.updatedAt) d.updatedAt = now
  return d
}

function modelProxy(name: string) {
  const t = toTable(name)
  return new Proxy({} as any, {
    get(_, method: string) {
      if (method === '$connect' || method === '$disconnect' || method === '$transaction' || method === '$extends') return async () => {}
      if (method === '$queryRaw' || method === '$executeRaw') return async (q: string, ...p: any[]) => (await client.execute(q, p)).rows
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
          const d = defaults(args?.data || {})
          const ks = Object.keys(d), vs = Object.values(d)
          const cols = ks.map(k => '"' + k + '"').join(',')
          const ph = ks.map(() => '?').join(',')
          await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          return d
        }
        if (method === 'createMany') {
          const items = args?.data || []
          for (const item of items) {
            const d = defaults(item)
            const ks = Object.keys(d), vs = Object.values(d)
            const cols = ks.map(k => '"' + k + '"').join(',')
            const ph = ks.map(() => '?').join(',')
            await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          }
          return { count: items.length }
        }
        if (method === 'update') {
          const d = args?.data || {}
          if (d.updatedAt === undefined) d.updatedAt = new Date().toISOString()
          const [ws, wp] = whereClause(args?.where)
          const sp: string[] = [], sv: any[] = []
          for (const [k, v] of Object.entries(d)) { sp.push('"' + k + '" = ?'); sv.push(v) }
          await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
          const r = await client.execute('SELECT * FROM "' + t + '" ' + ws + ' LIMIT 1', wp)
          return r.rows[0] || d
        }
        if (method === 'updateMany') {
          const d = args?.data || {}
          const [ws, wp] = whereClause(args?.where)
          const sp: string[] = [], sv: any[] = []
          for (const [k, v] of Object.entries(d)) { sp.push('"' + k + '" = ?'); sv.push(v) }
          await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
          return { count: 0 }
        }
        if (method === 'upsert') {
          const d = defaults(args?.create || args?.update || {})
          const [ws, wp] = whereClause(args?.where)
          const existing = await client.execute('SELECT * FROM "' + t + '" ' + ws + ' LIMIT 1', wp)
          if (existing.rows.length > 0) {
            const row = existing.rows[0]
            const ud = args?.update || {}
            if (ud.updatedAt === undefined) ud.updatedAt = new Date().toISOString()
            const sp: string[] = [], sv: any[] = []
            for (const [k, v] of Object.entries(ud)) { sp.push('"' + k + '" = ?'); sv.push(v) }
            await client.execute('UPDATE "' + t + '" SET ' + sp.join(',') + ' ' + ws, [...sv, ...wp])
            return row
          }
          const ks = Object.keys(d), vs = Object.values(d)
          const cols = ks.map(k => '"' + k + '"').join(',')
          const ph = ks.map(() => '?').join(',')
          await client.execute('INSERT INTO "' + t + '" (' + cols + ') VALUES (' + ph + ')', vs)
          return d
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
        if (method === 'groupBy') {
          const [ws, wp] = whereClause(args?.where)
          const by = args?.by || []
          const r = await client.execute('SELECT ' + by.map((b:string) => '"' + b + '"').join(',') + ' FROM "' + t + '" ' + ws + ' GROUP BY ' + by.map((b:string) => '"' + b + '"').join(','), wp)
          return r.rows
        }
        if (method === 'aggregate') {
          const [ws, wp] = whereClause(args?.where)
          const parts: string[] = []
          for (const [k, v] of Object.entries(args?._count || {})) {
            parts.push('COUNT("' + k + '") as "' + k + '_count"')
          }
          const r = await client.execute('SELECT ' + (parts.join(',') || '*') + ' FROM "' + t + '" ' + ws, wp)
          return r.rows[0] || {}
        }
        throw new Error('db.' + name + '.' + method + ' not implemented')
      }
    }
  })
}

export const db = new Proxy({} as any, {
  get(_, model: string) { return modelProxy(model) }
})
