import { createClient, Client } from '@libsql/client'

const _url = process.env.ASMYA_DB_URL || ''
const _auth = process.env.TURSO_AUTH_TOKEN || ''
let _db: Client | null = null
function getDb(): Client {
  if (!_db) _db = createClient({ url: _url, authToken: _auth })
  return _db
}

interface ModelMeta { table: string; cols: string[]; pk: string; uniques?: Record<string, string[]> }
const S: Record<string, ModelMeta> = {
  user:               { table:'User',              pk:'id', cols:['id','username','password','displayName','avatarUrl','role','side','createdAt','updatedAt','subAmirId'], uniques:{ username:['username'] } },
  chat:               { table:'Chat',              pk:'id', cols:['id','name','type','side','createdAt','updatedAt'] },
  chatMember:         { table:'ChatMember',        pk:'id', cols:['id','chatId','userId','joinedAt'], uniques:{ chatId_userId:['chatId','userId'] } },
  message:            { table:'Message',           pk:'id', cols:['id','chatId','senderId','type','content','mediaUrl','createdAt'] },
  announcement:       { table:'Announcement',      pk:'id', cols:['id','title','content','mediaUrl','createdBy','side','isPublic','createdAt','updatedAt'] },
  plan:               { table:'Plan',              pk:'id', cols:['id','title','description','status','dueDate','reminderAt','createdBy','side','createdAt','updatedAt'] },
  planAssignment:     { table:'PlanAssignment',    pk:'id', cols:['id','planId','userId','createdAt'], uniques:{ planId_userId:['planId','userId'] } },
  report:             { table:'Report',            pk:'id', cols:['id','title','content','planId','createdBy','side','createdAt','updatedAt'] },
  cashEntry:          { table:'CashEntry',         pk:'id', cols:['id','type','amount','category','description','accountType','createdBy','side','date','createdAt','updatedAt'] },
  publicPost:         { table:'PublicPost',        pk:'id', cols:['id','content','mediaUrl','mediaType','postedBy','side','createdAt','updatedAt'] },
  publicComment:      { table:'PublicComment',     pk:'id', cols:['id','postId','content','postedBy','createdAt'] },
  aiUsage:            { table:'AiUsage',           pk:'id', cols:['id','userId','query','category','language','side','responseTimeMs','createdAt'] },
  activityLog:        { table:'ActivityLog',       pk:'id', cols:['id','userId','action','details','side','createdAt'] },
  attendanceRecord:   { table:'AttendanceRecord',  pk:'id', cols:['id','studentId','date','status','notes','createdAt'], uniques:{ studentId_date:['studentId','date'] } },
  dailyActivityRecord:{ table:'DailyActivityRecord',pk:'id', cols:['id','studentId','date','type','completed','notes','createdAt'], uniques:{ studentId_date_type:['studentId','date','type'] } },
  pushSubscription:   { table:'PushSubscription',  pk:'id', cols:['id','userId','endpoint','p256dh','auth','createdAt','updatedAt'] },
  revisionDebt:       { table:'RevisionDebt',      pk:'id', cols:['id','studentId','date','reason','status','resolvedAt','createdAt','updatedAt'] },
  testResult:         { table:'TestResult',        pk:'id', cols:['id','studentId','teacherId','title','subject','score','maxScore','imageUrl','notes','createdAt','updatedAt'] },
  parentProfile:      { table:'parent_profiles',   pk:'id', cols:['id','userId','createdAt','updatedAt'] },
  studentProfile:     { table:'student_profiles',  pk:'id', cols:['id','userId','parentId','grade','createdAt','updatedAt'] },
  teacherProfile:     { table:'teacher_profiles',  pk:'id', cols:['id','userId','subject','createdAt','updatedAt'] },
  signupRequest:      { table:'SignupRequest',     pk:'id', cols:['id','username','password','displayName','role','childUsername','status','createdAt','updatedAt'], uniques:{ username:['username'] } },
}

const R: Record<string, Record<string, {to:string;fk:string;dir:'o'|'i'}>> = {
  user: {
    chatMember:{to:'chatMember',fk:'userId',dir:'o'}, chatMemberships:{to:'chatMember',fk:'userId',dir:'o'},
    other_User:{to:'user',fk:'subAmirId',dir:'o'}, followers:{to:'user',fk:'subAmirId',dir:'o'},
    studentProfile:{to:'studentProfile',fk:'userId',dir:'i'}, parentProfile:{to:'parentProfile',fk:'userId',dir:'i'}, teacherProfile:{to:'teacherProfile',fk:'userId',dir:'i'},
  },
  chat: { members:{to:'chatMember',fk:'chatId',dir:'o'}, messages:{to:'message',fk:'chatId',dir:'o'} },
  chatMember: { chat:{to:'chat',fk:'chatId',dir:'i'}, user:{to:'user',fk:'userId',dir:'i'} },
  message: { sender:{to:'user',fk:'senderId',dir:'i'}, chat:{to:'chat',fk:'chatId',dir:'i'} },
  announcement: { creator:{to:'user',fk:'createdBy',dir:'i'} },
  plan: { creator:{to:'user',fk:'createdBy',dir:'i'}, assignments:{to:'planAssignment',fk:'planId',dir:'o'}, reports:{to:'report',fk:'planId',dir:'o'} },
  planAssignment: { user:{to:'user',fk:'userId',dir:'i'}, plan:{to:'plan',fk:'planId',dir:'i'} },
  report: { creator:{to:'user',fk:'createdBy',dir:'i'}, plan:{to:'plan',fk:'planId',dir:'i'} },
  cashEntry: { creator:{to:'user',fk:'createdBy',dir:'i'} },
  publicPost: { poster:{to:'user',fk:'postedBy',dir:'i'}, comments:{to:'publicComment',fk:'postId',dir:'o'} },
  publicComment: { poster:{to:'user',fk:'postedBy',dir:'i'}, publicPost:{to:'publicPost',fk:'postId',dir:'i'} },
  aiUsage: { user:{to:'user',fk:'userId',dir:'i'} },
  attendanceRecord: { student:{to:'user',fk:'studentId',dir:'i'} },
  dailyActivityRecord: { student:{to:'user',fk:'studentId',dir:'i'} },
  revisionDebt: { student:{to:'user',fk:'studentId',dir:'i'} },
  testResult: { User_TestResult_teacherIdToUser:{to:'user',fk:'teacherId',dir:'i'}, User_TestResult_studentIdToUser:{to:'user',fk:'studentId',dir:'i'} },
  parentProfile: { user:{to:'user',fk:'userId',dir:'i'}, children:{to:'studentProfile',fk:'parentId',dir:'o'} },
  studentProfile: { user:{to:'user',fk:'userId',dir:'i'}, parent:{to:'user',fk:'parentId',dir:'i'} },
  teacherProfile: { user:{to:'user',fk:'userId',dir:'i'} },
}

function camel(s: string): string { return s.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase()) }
function toCamelRow(row: Record<string, any>): Record<string, any> { const o: any = {}; for (const [k,v] of Object.entries(row)) o[camel(k)] = v; return o }
function dateVal(v: any): any { return v instanceof Date ? v.toISOString() : v }

function buildWhere(model: string, where: any, params: any[], alias?: string): {sql:string;joins:string[]} {
  if (!where || typeof where !== 'object' || !Object.keys(where).length) return {sql:'',joins:[]}
  const m = S[model], a = alias || m.table, rels = R[model] || {}, conds: string[] = [], joins: string[] = []
  for (const [key, val] of Object.entries(where)) {
    if (rels[key] && typeof val === 'object' && val !== null) {
      const rel = rels[key], tM = S[rel.to], ja = key+'_j'
      joins.push(rel.dir==='o' ? `JOIN ${tM.table} ${ja} ON ${ja}.${rel.fk} = ${a}.${m.pk}` : `JOIN ${tM.table} ${ja} ON ${ja}.${tM.pk} = ${a}.${rel.fk}`)
      const n = buildWhere(rel.to, val, params, ja)
      if (n.sql) conds.push(n.sql.replace(/^WHERE /,''))
      joins.push(...n.joins)
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const col = a+'.'+key
      if ('in' in val && Array.isArray(val.in) && val.in.length > 0) { conds.push(`${col} IN (${val.in.map(()=>'?').join(',')})`); params.push(...val.in.map(dateVal)) }
      else if ('notIn' in val && Array.isArray(val.notIn) && val.notIn.length > 0) { conds.push(`${col} NOT IN (${val.notIn.map(()=>'?').join(',')})`); params.push(...val.notIn.map(dateVal)) }
      else { const ops:{[k:string]:string} = {gte:'>=',gt:'>',lte:'<=',lt:'<',neq:'!=',equals:'='}; for (const [op,ov] of Object.entries(val)) { if (ops[op]) { conds.push(`${col} ${ops[op]} ?`); params.push(dateVal(ov)) } } }
    } else { conds.push(`${a}.${key} = ?`); params.push(dateVal(val)) }
  }
  return {sql: conds.length ? 'WHERE '+conds.join(' AND ') : '', joins}
}

function buildOrderBy(model: string, orderBy: any, alias?: string, joins?: string[]): {sql:string;joins:string[]} {
  if (!orderBy || typeof orderBy !== 'object') return {sql:'',joins:joins||[]}
  const parts:string[] = [], j = joins||[], a = alias||S[model].table, rels = R[model]||{}
  for (const [field, dir] of Object.entries(orderBy)) {
    const d = String(dir).toUpperCase()==='DESC'?'DESC':'ASC'
    if (typeof dir === 'object' && dir !== null) {
      const rel = rels[field]
      if (rel) { const tM=S[rel.to], ja=field+'_ord'; j.push(rel.dir==='i'?`JOIN ${tM.table} ${ja} ON ${ja}.${tM.pk} = ${a}.${rel.fk}`:`JOIN ${tM.table} ${ja} ON ${ja}.${rel.fk} = ${a}.${S[model].pk}`); for (const [of,od] of Object.entries(dir)) parts.push(`${ja}.${of} ${String(od).toUpperCase()==='DESC'?'DESC':'ASC'}`) }
    } else { parts.push(`${a}.${field} ${d}`) }
  }
  return {sql: parts.length ? 'ORDER BY '+parts.join(', ') : '', joins:j}
}

async function doIncludes(model: string, rows: any[], inc: Record<string,any>): Promise<any[]> {
  if (!inc || !rows.length) return rows
  const rels = R[model]||{}
  for (const [rn, ro] of Object.entries(inc)) {
    const rel = rels[rn]
    if (!rel) { for (const row of rows) row[rn]=null; continue }
    const isBool = ro===true, subInc=isBool?null:ro.include, subSel=isBool?null:ro.select, subOrd=isBool?null:ro.orderBy, subTake=isBool?null:ro.take
    const tM=S[rel.to], tT=tM.table, tPk=tM.pk
    if (rel.dir==='o') {
      const spk=S[model].pk, ids=[...new Set(rows.map((r:any)=>r[spk]).filter(Boolean))]
      if (!ids.length) { for (const row of rows) row[rn]=[]; continue }
      let sql=`SELECT * FROM ${tT} WHERE ${rel.fk} IN (${ids.map(()=>'?').join(',')})`
      const args:any[]=[...ids]
      if (subOrd) { const{sql:ob,joins:obJ}=buildOrderBy(rel.to,subOrd,tT,[]); sql+=' '+ob; for(const j of obJ) sql+=' '+j }
      if (subTake) sql+=` LIMIT ${subTake}`
      let rr=(await getDb().execute({sql,args})).rows.map((r:any)=>toCamelRow(r))
      if (subInc) rr=await doIncludes(rel.to,rr,subInc)
      if (subSel) rr=rr.map((r:any)=>applySel(r,subSel))
      for (const row of rows) row[rn]=rr.filter((r:any)=>r[rel.fk]===row[spk])
    } else {
      const ids=[...new Set(rows.map((r:any)=>r[rel.fk]).filter(Boolean))]
      if (!ids.length) { for (const row of rows) row[rn]=null; continue }
      const sql=`SELECT * FROM ${tT} WHERE ${tPk} IN (${ids.map(()=>'?').join(',')})`
      let rr=(await getDb().execute({sql,args:ids})).rows.map((r:any)=>toCamelRow(r))
      if (subInc) rr=await doIncludes(rel.to,rr,subInc)
      if (subSel) rr=rr.map((r:any)=>applySel(r,subSel))
      const map=new Map(rr.map((r:any)=>[r[tPk],r]))
      for (const row of rows) row[rn]=map.get(row[rel.fk])||null
    }
  }
  return rows
}

function applySel(row: any, sel: any): any {
  if (!sel || typeof sel !== 'object') return row
  const out: any = {}
  for (const [key, val] of Object.entries(sel)) {
    if (val === true && key in row) out[key] = row[key]
    else if (typeof val === 'object' && val !== null && key in row) out[key] = applySel(row[key], val)
  }
  return out
}

async function doNestedCreates(model: string, parentId: string, data: any): Promise<void> {
  const rels = R[model]||{}
  for (const [key, val] of Object.entries(data)) {
    if (!val || typeof val !== 'object') continue
    const rel = rels[key]
    if (!rel || !val.create) continue
    const items = Array.isArray(val.create)?val.create:[val.create]
    for (const item of items) {
      const tM=S[rel.to], cols:string[]=[], vals:any[]=[], phs:string[]=[]
      if (rel.dir==='o') { cols.push(rel.fk); vals.push(parentId); phs.push('?') }
      else { cols.push(rel.fk); vals.push(parentId); phs.push('?') }
      for (const [f,v] of Object.entries(item)) { if (tM.cols.includes(f)) { cols.push(f); vals.push(dateVal(v)); phs.push('?') } }
      await getDb().execute({sql:`INSERT INTO ${tM.table} (${cols.join(',')}) VALUES (${phs.join(',')})`,args:vals})
    }
  }
}

function resolveWhereKey(model: string, where: any): string|null {
  const u = S[model].uniques; if (!u) return null
  for (const [uname, ufields] of Object.entries(u)) { if (ufields.length>1 && where[uname]) return uname }
  return null
}

async function query(model: string, method: string, opts: any={}): Promise<any> {
  const meta=S[model]; if (!meta) throw new Error('Unknown model: '+model)
  const {table,pk,cols,uniques}=meta, client=getDb()

  if (method==='findUnique') {
    const {where={},include,select}=opts, params:any[]=[]
    const{sql:wSql,joins}=buildWhere(model,where,params)
    const res=await client.execute({sql:`SELECT * FROM ${table} ${joins.join(' ')} ${wSql} LIMIT 1`,args:params})
    if (!res.rows.length) return null
    let row=toCamelRow(res.rows[0] as any)
    if (include) [row]=await doIncludes(model,[row],include)
    if (select) row=applySel(row,select)
    return row
  }

  if (method==='findFirst') {
    const {where={},include,select,orderBy,take}=opts, params:any[]=[]
    const{sql:wSql,joins:wJ}=buildWhere(model,where,params), aJ=[...wJ]
    let sql=`SELECT * FROM ${table} ${aJ.join(' ')} ${wSql}`
    if (orderBy) { const{sql:ob,joins:obJ}=buildOrderBy(model,orderBy,table,aJ); sql+=' '+ob; aJ.push(...obJ) }
    sql+=' LIMIT '+(take||1)
    const res=await client.execute({sql,args:params})
    let rows=res.rows.map((r:any)=>toCamelRow(r))
    if (include) rows=await doIncludes(model,rows,include)
    if (select) rows=rows.map((r:any)=>applySel(r,select))
    return rows[0]||null
  }

  if (method==='findMany') {
    const {where={},include,select,orderBy,take,skip}=opts, params:any[]=[]
    const{sql:wSql,joins:wJ}=buildWhere(model,where,params), aJ=[...wJ]
    let sql=`SELECT * FROM ${table} ${aJ.join(' ')} ${wSql}`
    if (orderBy) { const{sql:ob,joins:obJ}=buildOrderBy(model,orderBy,table,aJ); sql+=' '+ob; aJ.push(...obJ) }
    if (skip) sql+=` OFFSET ${skip}`
    if (take) sql+=` LIMIT ${take}`
    const res=await client.execute({sql,args:params})
    let rows=res.rows.map((r:any)=>toCamelRow(r))
    if (include) rows=await doIncludes(model,rows,include)
    if (select) rows=rows.map((r:any)=>applySel(r,select))
    return rows
  }

  if (method==='create') {
    const {data,include,select}=opts
    const iC:string[]=[],iV:any[]=[],pH:string[]=[],nD:Record<string,any>={}
    for (const [key,val] of Object.entries(data)) {
      if (val===undefined) continue
      if (typeof val==='object'&&val!==null&&!Array.isArray(val)&&'create' in val) { nD[key]=val; continue }
      if (cols.includes(key)) { iC.push(key); iV.push(dateVal(val)); pH.push('?') }
    }
    if (pk==='id'&&!iC.includes('id')) { iC.unshift('id'); iV.unshift(crypto.randomUUID()); pH.unshift('?') }
    if (cols.includes('updatedAt')&&!iC.includes('updatedAt')) { iC.push('updatedAt'); iV.push(new Date().toISOString()); pH.push('?') }
    if (cols.includes('createdAt')&&!iC.includes('createdAt')) { iC.push('createdAt'); iV.push(new Date().toISOString()); pH.push('?') }
    const res=await client.execute({sql:`INSERT INTO ${table} (${iC.join(',')}) VALUES (${pH.join(',')}) RETURNING *`,args:iV})
    let row=toCamelRow(res.rows[0] as any)
    for (const [nk,nv] of Object.entries(nD)) await doNestedCreates(model,row[pk],{[nk]:nv})
    if (include||Object.keys(nD).length) {
      const{sql:w2}=buildWhere(model,{id:row[pk]},[])
      let fresh=toCamelRow((await client.execute({sql:`SELECT * FROM ${table} ${w2} LIMIT 1`,args:[]})).rows[0] as any)
      if (include) [fresh]=await doIncludes(model,[fresh],include)
      row=fresh
    }
    if (select) row=applySel(row,select)
    return row
  }

  if (method==='update') {
    const {where,data,include,select}=opts
    const sP:string[]=[],params:any[]=[]
    for (const [key,val] of Object.entries(data)) {
      if (val===undefined) continue
      if (typeof val==='object'&&val!==null&&!Array.isArray(val)&&'create' in val) continue
      if (cols.includes(key)) { sP.push(`${key} = ?`); params.push(dateVal(val)) }
    }
    if (cols.includes('updatedAt')&&!sP.some(p=>p.startsWith('updatedAt'))) { sP.push('updatedAt = ?'); params.push(new Date().toISOString()) }
    if (!sP.length) sP.push(`${pk} = ${pk}`)
    const{sql:wSql}=buildWhere(model,where,params)
    await client.execute({sql:`UPDATE ${table} SET ${sP.join(', ')} ${wSql}`,args:params})
    for (const [key,val] of Object.entries(data)) {
      if (typeof val==='object'&&val!==null&&'create' in val) { const pid=where[pk]||where.id; if(pid) await doNestedCreates(model,pid,{[key]:val}) }
    }
    const{sql:w2}=buildWhere(model,where,[])
    let row=toCamelRow((await client.execute({sql:`SELECT * FROM ${table} ${w2} LIMIT 1`,args:[]})).rows[0] as any)
    if (include) [row]=await doIncludes(model,[row],include)
    if (select) row=applySel(row,select)
    return row
  }

  if (method==='delete') {
    const {where}=opts, params:any[]=[]
    const{sql:wSql}=buildWhere(model,where,params)
    const ex=await client.execute({sql:`SELECT * FROM ${table} ${wSql} LIMIT 1`,args:params})
    if (!ex.rows.length) throw new Error('Record not found')
    const row=toCamelRow(ex.rows[0] as any)
    await client.execute({sql:`DELETE FROM ${table} ${wSql}`,args:params})
    return row
  }

  if (method==='deleteMany') {
    const {where={}}=opts, params:any[]=[]
    const{sql:wSql}=buildWhere(model,where,params)
    await client.execute({sql:`DELETE FROM ${table} ${wSql}`,args:params})
    return {count:0}
  }

  if (method==='upsert') {
    const {where,create,update:uData,include,select}=opts
    const ukey=resolveWhereKey(model,where)
    let fW:any = ukey&&where[ukey]?{...where[ukey]}:{...where}
    const params:any[]=[]
    const{sql:wSql}=buildWhere(model,fW,params)
    const ex=await client.execute({sql:`SELECT ${pk} FROM ${table} ${wSql} LIMIT 1`,args:params})
    if (ex.rows.length>0) return query(model,'update',{where:fW,data:uData,include,select})
    else return query(model,'create',{data:{...fW,...create},include,select})
  }

  if (method==='count') {
    const {where={}}=opts, params:any[]=[]
    const{sql:wSql,joins}=buildWhere(model,where,params)
    const res=await client.execute({sql:`SELECT COUNT(*) as cnt FROM ${table} ${joins.join(' ')} ${wSql}`,args:params})
    return (res.rows[0] as any).cnt||0
  }

  if (method==='groupBy') {
    const {by,_count,_avg,_min,_max,where}=opts
    const sP=[...by], params:any=[], gS=''
    if (where) { const{sql:w,joins}=buildWhere(model,where,params); gS=` ${w} ${joins.join(' ')}` }
    if (_count) for (const f of Object.keys(_count)) sP.push(`COUNT(${f}) as _count_${f}`)
    if (_avg) for (const f of Object.keys(_avg)) sP.push(`AVG(${f}) as _avg_${f}`)
    if (_min) for (const f of Object.keys(_min)) sP.push(`MIN(${f}) as _min_${f}`)
    if (_max) for (const f of Object.keys(_max)) sP.push(`MAX(${f}) as _max_${f}`)
    const res=await client.execute({sql:`SELECT ${sP.join(', ')} FROM ${table}${gS} GROUP BY ${by.join(', ')}`,args:params})
    return res.rows.map((r:any)=>{ const row=toCamelRow(r)
      if(_count){row._count={};for(const f of Object.keys(_count))row._count[f]=row['_count_'+f]??0}
      if(_avg){row._avg={};for(const f of Object.keys(_avg))row._avg[f]=row['_avg_'+f]!=null?Number(row['_avg_'+f]):null}
      if(_min){row._min={};for(const f of Object.keys(_min))row._min[f]=row['_min_'+f]}
      if(_max){row._max={};for(const f of Object.keys(_max))row._max[f]=row['_max_'+f]}
      return row
    })
  }

  if (method==='aggregate') {
    const {where,_count,_avg,_min,_max}=opts
    const sP=['1 as _d'], params:any=[], aS=''
    if (where) { const{sql:w,joins}=buildWhere(model,where,params); aS=` ${w} ${joins.join(' ')}` }
    if (_count) for (const f of Object.keys(_count)) sP.push(`COUNT(${f}) as _count_${f}`)
    if (_avg) for (const f of Object.keys(_avg)) sP.push(`AVG(${f}) as _avg_${f}`)
    if (_min) for (const f of Object.keys(_min)) sP.push(`MIN(${f}) as _min_${f}`)
    if (_max) for (const f of Object.keys(_max)) sP.push(`MAX(${f}) as _max_${f}`)
    const res=await client.execute({sql:`SELECT ${sP.join(', ')} FROM ${table}${aS}`,args:params})
    const r=toCamelRow(res.rows[0] as any), out:any={}
    if(_count){out._count={};for(const f of Object.keys(_count))out._count[f]=r['_count_'+f]??0}
    if(_avg){out._avg={};for(const f of Object.keys(_avg))out._avg[f]=r['_avg_'+f]!=null?Number(r['_avg_'+f]):null}
    if(_min){out._min={};for(const f of Object.keys(_min))out._min[f]=r['_min_'+f]}
    if(_max){out._max={};for(const f of Object.keys(_max))out._max[f]=r['_max_'+f]}
    return out
  }

  throw new Error('Unknown method: '+method)
}

export const db = new Proxy({} as any, {
  get(_: any, model: string) {
    if (model==='then'||model==='toJSON') return undefined
    return new Proxy({}, {
      get(_: any, method: string) {
        if (method==='then'||method==='toJSON') return undefined
        return (opts?: any) => query(String(model).toLowerCase(), String(method), opts)
      }
    })
  }
})
