import { createClient, type Client } from '@libsql/client';

const client: Client = createClient({
  url: process.env.ASMYA_DB_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TABLE_MAP: Record<string, string> = {
  user: 'User',
  report: 'Report',
  plan: 'Plan',
  planAssignment: 'PlanAssignment',
  announcement: 'Announcement',
  chat: 'Chat',
  chatMember: 'ChatMember',
  message: 'Message',
  cashEntry: 'CashEntry',
  parentProfile: 'parent_profiles',
  studentProfile: 'student_profiles',
  teacherProfile: 'teacher_profiles',
  activityLog: 'ActivityLog',
  attendanceRecord: 'AttendanceRecord',
  dailyActivityRecord: 'DailyActivityRecord',
  signupRequest: 'SignupRequest',
  testResult: 'TestResult',
  revisionDebt: 'RevisionDebt',
  publicPost: 'PublicPost',
  publicComment: 'PublicComment',
  pushSubscription: 'PushSubscription',
  aiUsage: 'AiUsage',
};

const RELATIONS: Record<string, Record<string, { table: string; fk: string; type: 'one' | 'many' }>> = {
  Report: { creator: { table: 'User', fk: 'createdBy', type: 'one' }, plan: { table: 'Plan', fk: 'planId', type: 'one' } },
  Plan: { creator: { table: 'User', fk: 'createdBy', type: 'one' }, assignments: { table: 'PlanAssignment', fk: 'planId', type: 'many' } },
  Announcement: { creator: { table: 'User', fk: 'createdBy', type: 'one' } },
  Chat: { members: { table: 'ChatMember', fk: 'chatId', type: 'many' }, messages: { table: 'Message', fk: 'chatId', type: 'many' } },
  ChatMember: { user: { table: 'User', fk: 'userId', type: 'one' }, chat: { table: 'Chat', fk: 'chatId', type: 'one' } },
  PlanAssignment: { user: { table: 'User', fk: 'userId', type: 'one' }, plan: { table: 'Plan', fk: 'planId', type: 'one' } },
  CashEntry: { creator: { table: 'User', fk: 'createdBy', type: 'one' } },
  Message: { chat: { table: 'Chat', fk: 'chatId', type: 'one' }, sender: { table: 'User', fk: 'senderId', type: 'one' } },
  PublicPost: { author: { table: 'User', fk: 'postedBy', type: 'one' }, comments: { table: 'PublicComment', fk: 'postId', type: 'many' } },
  PublicComment: { post: { table: 'PublicPost', fk: 'postId', type: 'one' }, author: { table: 'User', fk: 'postedBy', type: 'one' } },
  ActivityLog: { user: { table: 'User', fk: 'userId', type: 'one' } },
  AttendanceRecord: { student: { table: 'User', fk: 'studentId', type: 'one' } },
  DailyActivityRecord: { student: { table: 'User', fk: 'studentId', type: 'one' } },
  TestResult: { student: { table: 'User', fk: 'studentId', type: 'one' }, teacher: { table: 'User', fk: 'teacherId', type: 'one' } },
  RevisionDebt: { student: { table: 'User', fk: 'studentId', type: 'one' } },
  PushSubscription: { user: { table: 'User', fk: 'userId', type: 'one' } },
  AiUsage: { user: { table: 'User', fk: 'userId', type: 'one' } },
};

const TABLES_WITH_UA = new Set(['User','Report','Plan','Announcement','CashEntry','Chat','PublicPost','TestResult','RevisionDebt','SignupRequest','parent_profiles','student_profiles','teacher_profiles','PushSubscription']);

function getTable(model: string): string { return TABLE_MAP[model] || model; }

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildWhere(where: Record<string, any> | undefined, params: any[], prefix: string = ''): string {
  if (!where || Object.keys(where).length === 0) return '1=1';
  const conditions: string[] = [];
  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) continue;
    const col = `${prefix}"${key}"`;
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.contains !== undefined) { params.push(`%${value.contains}%`); conditions.push(`${col} LIKE ?`); }
      else if (value.startsWith !== undefined) { params.push(`${value.startsWith}%`); conditions.push(`${col} LIKE ?`); }
      else if (value.endsWith !== undefined) { params.push(`%${value.endsWith}`); conditions.push(`${col} LIKE ?`); }
      else if (value.in !== undefined && Array.isArray(value.in) && value.in.length > 0) { params.push(...value.in); conditions.push(`${col} IN (${value.in.map(() => '?').join(', ')})`); }
      else if (value.not !== undefined) { if (value.not === null) conditions.push(`${col} IS NOT NULL`); else { params.push(value.not); conditions.push(`${col} != ?`); } }
      else if (value.gte !== undefined) { params.push(value.gte); conditions.push(`${col} >= ?`); }
      else if (value.lte !== undefined) { params.push(value.lte); conditions.push(`${col} <= ?`); }
      else if (value.gt !== undefined) { params.push(value.gt); conditions.push(`${col} > ?`); }
      else if (value.lt !== undefined) { params.push(value.lt); conditions.push(`${col} < ?`); }
      else if (value.equals !== undefined) { if (value.equals === null) conditions.push(`${col} IS NULL`); else { params.push(value.equals); conditions.push(`${col} = ?`); } }
    } else { params.push(value); conditions.push(`${col} = ?`); }
  }
  return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '1=1';
}

function buildOrderBy(orderBy: any, prefix: string = ''): string {
  if (!orderBy) return '';
  const parts: string[] = [];
  const p = (o: any) => { if (typeof o === 'string') return `${prefix}"${o}" DESC`; for (const [k, d] of Object.entries(o)) parts.push(`${prefix}"${k}" ${(d as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`); };
  if (Array.isArray(orderBy)) orderBy.forEach(p); else p(orderBy);
  return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '';
}

function rowToObject(row: any, columns: any[]): Record<string, any> { const o: Record<string, any> = {}; for (const c of columns) o[c.name] = row[c.name]; return o; }

async function resolveIncludes(rows: any[], tableName: string, include: Record<string, any>, dbClient: Client): Promise<any[]> {
  if (!rows.length) return rows;
  const tr = RELATIONS[tableName] || {};
  for (const [rn, rs] of Object.entries(include)) {
    const rel = tr[rn]; if (!rel) continue;
    const ni = (typeof rs === 'object' && rs !== null) ? (rs as any).include : undefined;
    const pids = [...new Set(rows.map((r: any) => r.id).filter(Boolean))];
    if (pids.length === 0) continue;
    const res = await dbClient.execute({ sql: `SELECT * FROM "${rel.table}" WHERE "${rel.fk}" IN (${pids.map(() => '?').join(', ')})`, args: pids });
    if (rel.type === 'one') {
      const m = new Map<string, any>();
      for (const row of res.rows) { const o = rowToObject(row, res.columns); delete o.password; m.set(row[rel.fk] as string, o); }
      if (ni) await resolveIncludes([...m.values()], rel.table, ni, dbClient);
      for (const row of rows) row[rn] = m.get(row.id) || null;
    } else {
      const g = new Map<string, any[]>();
      for (const row of res.rows) { const o = rowToObject(row, res.columns); delete o.password; const k = row[rel.fk] as string; if (!g.has(k)) g.set(k, []); g.get(k)!.push(o); }
      if (ni) { for (const [, gr] of g) await resolveIncludes(gr, rel.table, ni, dbClient); }
      for (const row of rows) row[rn] = g.get(row.id) || [];
    }
  }
  return rows;
}

function flattenNestedData(data: Record<string, any>, tableName: string) {
  const columns: string[] = []; const values: any[] = []; const nc: any[] = [];
  const tr = RELATIONS[tableName] || {}; const now = new Date().toISOString();
  let hasId = false, hasCA = false, hasUA = false;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const rel = tr[key];
    if (rel) {
      if (rel.type === 'one' && typeof value === 'object' && value !== null) {
        if (value.connect?.id) { columns.push(`"${rel.fk}"`); values.push(value.connect.id); }
        else if (value.id) { columns.push(`"${rel.fk}"`); values.push(value.id); }
      } else if (rel.type === 'many') {
        let items: any[] = [];
        if (typeof value === 'object' && !Array.isArray(value) && value.create) items = value.create;
        else if (Array.isArray(value)) items = value;
        if (items.length > 0) nc.push({ table: rel.table, fk: rel.fk, items });
      }
      continue;
    }
    if (key === 'id') hasId = true; if (key === 'createdAt') hasCA = true; if (key === 'updatedAt') hasUA = true;
    columns.push(`"${key}"`); values.push(value);
  }
  if (!hasId) { columns.unshift('"id"'); values.unshift(generateId()); }
  if (!hasCA) { columns.push('"createdAt"'); values.push(now); }
  if (!hasUA && TABLES_WITH_UA.has(tableName)) { columns.push('"updatedAt"'); values.push(now); }
  return { columns, values, nc };
}

const db = new Proxy({} as any, {
  get(_target, model: string) {
    const tn = getTable(model);
    return new Proxy({} as any, {
      get(_target, method: string) {
        switch (method) {
          case 'findMany': return async (args: any = {}) => {
            const { where, include, select, orderBy, take, skip } = args;
            const params: any[] = [];
            const sc = select ? Object.keys(select).map(k => `t."${k}"`).join(', ') : 't.*';
            let sql = `SELECT ${sc} FROM "${tn}" t`;
            const w = buildWhere(where, params, 't.');
            if (w !== '1=1') sql += ` WHERE ${w}`;
            sql += ` ${buildOrderBy(orderBy, 't.')}`;
            if (take) sql += ` LIMIT ${Number(take)}`;
            if (skip) sql += ` OFFSET ${Number(skip)}`;
            const r = await client.execute({ sql: sql.replace(/\s+/g, ' ').trim(), args: params });
            let rows = r.rows.map(row => rowToObject(row, r.columns));
            if (include) rows = await resolveIncludes(rows, tn, include, client);
            if (select) { const ks = Object.keys(select); rows = rows.map(row => { const p: Record<string,any> = {}; for (const k of ks) p[k] = row[k]; return p; }); }
            return rows;
          };
          case 'findFirst': return async (args: any = {}) => { const r = await db[model].findMany({ ...args, take: 1 }); return r[0] || null; };
          case 'findUnique': return async (args: any = {}) => { if (!args.where) return null; return await db[model].findFirst({ where: args.where }); };
          case 'create': return async (args: any = {}) => {
            const { data, include } = args;
            const { columns, values, nc } = flattenNestedData(data || {}, tn);
            await client.execute({ sql: `INSERT INTO "${tn}" (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, args: values });
            const nid = values[columns.indexOf('"id"')];
            for (const n of nc) {
              for (const item of n.items) {
                const sr = RELATIONS[n.table] || {};
                const sc: string[] = []; const sv: any[] = []; let si = false, sca = false;
                const sn = new Date().toISOString();
                for (const [k, v] of Object.entries(item)) {
                  if (v === undefined) continue;
                  const srl = sr[k];
                  if (srl?.type === 'one' && typeof v === 'object' && v?.connect?.id) { sc.push(`"${srl.fk}"`); sv.push(v.connect.id); continue; }
                  if (k === 'id') si = true; if (k === 'createdAt') sca = true;
                  sc.push(`"${k}"`); sv.push(v);
                }
                if (!si) { sc.unshift('"id"'); sv.unshift(generateId()); }
                if (!sca) { sc.push('"createdAt"'); sv.push(sn); }
                sc.push(`"${n.fk}"`); sv.push(nid);
                await client.execute({ sql: `INSERT INTO "${n.table}" (${sc.join(', ')}) VALUES (${sc.map(() => '?').join(', ')})`, args: sv });
              }
            }
            const res = include ? await db[model].findMany({ where: { id: nid }, include }) : await db[model].findMany({ where: { id: nid } });
            return res[0] || null;
          };
          case 'update': return async (args: any = {}) => {
            const { where, data, include } = args;
            const params: any[] = []; const sp: string[] = [];
            if (TABLES_WITH_UA.has(tn)) { sp.push(`"updatedAt" = ?`); params.push(new Date().toISOString()); }
            if (data) { for (const [k, v] of Object.entries(data)) { if (k === 'id' || v === undefined) continue; sp.push(`"${k}" = ?`); params.push(v); } }
            if (sp.length === 0) return include ? await db[model].findFirst({ where, include }) : await db[model].findFirst({ where });
            const w = buildWhere(where, params, '');
            await client.execute({ sql: `UPDATE "${tn}" SET ${sp.join(', ')} WHERE ${w}`, args: params });
            return include ? await db[model].findFirst({ where, include }) : await db[model].findFirst({ where });
          };
          case 'delete': return async (args: any = {}) => { const p: any[] = []; const w = buildWhere(args.where, p, ''); const r = await client.execute({ sql: `DELETE FROM "${tn}" WHERE ${w}`, args: p }); return { count: r.rowsAffected }; };
          case 'deleteMany': return async (args: any = {}) => { const p: any[] = []; const w = buildWhere(args.where, p, ''); const r = await client.execute({ sql: `DELETE FROM "${tn}" WHERE ${w}`, args: p }); return { count: r.rowsAffected }; };
          case 'upsert': return async (args: any = {}) => { const e = await db[model].findFirst({ where: args.where }); return e ? await db[model].update({ where: args.where, data: args.update, include: args.include }) : await db[model].create({ data: { ...args.create, ...args.where }, include: args.include }); };
          case 'count': return async (args: any = {}) => { const p: any[] = []; const w = buildWhere(args.where, p, 't.'); const r = await client.execute({ sql: `SELECT COUNT(*) as count FROM "${tn}" t WHERE ${w}`, args: p }); return Number(r.rows[0].count); };
          case 'aggregate': return async (args: any = {}) => {
            const { where, _count, _sum, _avg, _min, _max } = args; const p: any[] = []; const parts: string[] = [];
            if (_count) for (const [k,v] of Object.entries(_count)) { if(v) parts.push(`COUNT("${k}") as "${k}"`); }
            if (_sum) for (const [k,v] of Object.entries(_sum)) { if(v) parts.push(`SUM("${k}") as "${k}"`); }
            if (_avg) for (const [k,v] of Object.entries(_avg)) { if(v) parts.push(`AVG("${k}") as "${k}"`); }
            if (_min) for (const [k,v] of Object.entries(_min)) { if(v) parts.push(`MIN("${k}") as "${k}"`); }
            if (_max) for (const [k,v] of Object.entries(_max)) { if(v) parts.push(`MAX("${k}") as "${k}"`); }
            if (parts.length === 0) parts.push('COUNT(*) as count');
            const w = buildWhere(where, p, 't.');
            const r = await client.execute({ sql: `SELECT ${parts.join(', ')} FROM "${tn}" t WHERE ${w}`, args: p });
            return rowToObject(r.rows[0], r.columns);
          };
          case 'groupBy': return async (args: any = {}) => {
            const { by, where, _count, _sum } = args; const p: any[] = [];
            const sp = by.map((b: string) => `t."${b}"`);
            if (_count) for (const [k,v] of Object.entries(_count)) { if(v) sp.push(`COUNT("${k}") as "${k}"`); }
            if (_sum) for (const [k,v] of Object.entries(_sum)) { if(v) sp.push(`SUM("${k}") as "${k}"`); }
            const w = buildWhere(where, p, 't.');
            const r = await client.execute({ sql: `SELECT ${sp.join(', ')} FROM "${tn}" t WHERE ${w} GROUP BY ${by.map((b: string) => `t."${b}"`).join(', ')}`, args: p });
            return r.rows.map(row => rowToObject(row, r.columns));
          };
          default: return undefined;
        }
      }
    });
  }
});

export default db;