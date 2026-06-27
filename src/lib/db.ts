import { createClient } from '@libsql/client'
const client = createClient({ url: process.env.ASMYA_DB_URL! })
const TM: Record<string,string> = { ParentProfile:'parent_profiles', StudentProfile:'student_profiles', TeacherProfile:'teacher_profiles' }
const RL: Record<string,Record<string,{t:string;fk:string}>> = {
  User:{ chatMemberships:{t:'ChatMember',fk:'userId'}, messages:{t:'Message',fk:'senderId'}, announcements:{t:'Announcement',fk:'createdBy'}, plans:{t:'Plan',fk:'createdBy'}, cashEntries:{t:'CashEntry',fk:'createdBy'}, reports:{t:'Report',fk:'createdBy'}, activityLogs:{t:'ActivityLog',fk:'userId'}, aiUsages:{t:'AiUsage',fk:'userId'} },
  Chat:{ chatMemberships:{t:'ChatMember',fk:'chatId'}, messages:{t:'Message',fk:'chatId'} },
  Plan:{ assignments:{t:'PlanAssignment',fk:'planId'}, reports:{t:'Report',fk:'planId'} },
  Announcement:{ user:{t:'User',fk:'id'} },
  PublicPost:{ comments:{t:'PublicComment',fk:'postId'} },
  CashEntry:{ user:{t:'User',fk:'id'} },
  Report:{ plan:{t:'Plan',fk:'id'}, user:{t:'User',fk:'id'} },
  PlanAssignment:{ plan:{t:'Plan',fk:'id'}, user:{t:'User',fk:'id'} },
}
function tb(m:string){return TM[m]||m}
function wh(w:any,v:any[]){
  if(!w)return ''
  const c:string[]=[]
  for(const[k,val]of Object.entries(w)){
    if(val===null||val===undefined){c.push(k+' IS NULL')}
    else if(typeof val==='object'&&!Array.isArray(val)){
      for(const[op,v2]of Object.entries(val)){
        if(op==='gte'){c.push(k+' >= ?');v.push(v2)}
        else if(op==='gt'){c.push(k+' > ?');v.push(v2)}
        else if(op==='lte'){c.push(k+' <= ?');v.push(v2)}
        else if(op==='lt'){c.push(k+' < ?');v.push(v2)}
        else if(op==='contains'){c.push(k+' LIKE ?');v.push('%'+v2+'%')}
        else if(op==='startsWith'){c.push(k+' LIKE ?');v.push(v2+'%')}
        else if(op==='in'){c.push(k+' IN ('+Array(val).fill('?').join(',')+')');v.push(...val)}
        else if(op==='not'){c.push(k+' != ?');v.push(v2)}
        else if(op==='equals'){c.push(k+' = ?');v.push(v2)}
        else{c.push(k+' = ?');v.push(v2)}
      }
    }else{c.push(k+' = ?');v.push(val)}
  }
  return c.join(' AND ')
}
function ob(o:any){
  if(!o)return ''
  if(typeof o==='string')return 'ORDER BY '+o
  return 'ORDER BY '+Object.entries(o).map(([k,d])=>k+(d==='desc'?' DESC':' ASC')).join(', ')
}
async function doInc(table:string,rows:any[],inc:any){
  for(const row of rows){
    for(const[rel]of Object.entries(inc)){
      const T=table[0].toUpperCase()+table.slice(1);const r=RL[T]?.[rel]
      if(r){
        const res=await client.execute({sql:'SELECT * FROM '+r.t+' WHERE '+r.fk+' = ?',args:[row.id]})
        row[rel]=res.rows
      }
    }
  }
}
async function findOne(t:string,a:any={}){
  const v:any[]=[];const w=wh(a.where,v)
  let sql='SELECT * FROM '+t+(w?' WHERE '+w:'')
  sql+=' '+ob(a.orderBy)+' LIMIT 1'
  const res=await client.execute({sql,args:v})
  const row=res.rows[0]||null
  if(row&&a.include)await doInc(t,[row],a.include)
  return row
}
async function findMany(t:string,a:any={}){
  const v:any[]=[];const w=wh(a.where,v)
  let sql='SELECT * FROM '+t
  if(w)sql+=' WHERE '+w
  sql+=' '+ob(a.orderBy)
  if(a.take)sql+=' LIMIT '+a.take
  if(a.skip)sql+=' OFFSET '+a.skip
  const res=await client.execute({sql,args:v})
  if(a.include)await doInc(t,res.rows,a.include)
  return res.rows
}
async function create(t:string,a:any){
  const d={...a.data};const now=new Date().toISOString()
  if(!d.id)d.id=crypto.randomUUID()
  if(!d.createdAt)d.createdAt=now
  if(!d.updatedAt)d.updatedAt=now
  const ks=Object.keys(d);const vs=Object.values(d)
  const ph=ks.map(()=>'?').join(', ')
  await client.execute({sql:'INSERT INTO '+t+' ('+ks.join(', ')+') VALUES ('+ph+')',args:vs})
  const row={...d}
  if(a.include)await doInc(t,[row],a.include)
  return row
}
async function update(t:string,a:any){
  const d={...a.data};d.updatedAt=new Date().toISOString()
  const v:any[]=[];const sets=Object.entries(d).map(([k,val])=>{v.push(val);return k+' = ?'}).join(', ')
  const w=wh(a.where,v)
  await client.execute({sql:'UPDATE '+t+' SET '+sets+' WHERE '+w,args:v})
  const fv:any[]=[];const fw=wh(a.where,fv)
  const res=await client.execute({sql:'SELECT * FROM '+t+' WHERE '+fw+' LIMIT 1',args:fv})
  const row=res.rows[0]||null
  if(row&&a.include)await doInc(t,[row],a.include)
  return row
}
async function updateMany(t:string,a:any){
  const d={...a.data};d.updatedAt=new Date().toISOString()
  const v:any[]=[];const sets=Object.entries(d).map(([k,val])=>{v.push(val);return k+' = ?'}).join(', ')
  const w=wh(a.where,v)
  await client.execute({sql:'UPDATE '+t+' SET '+sets+' WHERE '+w,args:v})
  return{count:0}
}
async function del(t:string,a:any){
  const v:any[]=[];const w=wh(a.where,v)
  await client.execute({sql:'DELETE FROM '+t+' WHERE '+w,args:v})
  return a.where
}
async function delMany(t:string,a:any={}){
  const v:any[]=[];const w=wh(a.where,v)
  await client.execute({sql:'DELETE FROM '+t+(w?' WHERE '+w:''),args:v})
  return{count:0}
}
async function count(t:string,a:any={}){
  const v:any[]=[];const w=wh(a.where,v)
  const res=await client.execute({sql:'SELECT COUNT(*) as count FROM '+t+(w?' WHERE '+w:''),args:v})
  return Number(res.rows[0].count)
}
export const db=new Proxy({}as any,{
  get(_,model:string){
    return new Proxy({}as any,{
      get(_,method:string){
        const t=tb(model)
        if(method==='findUnique')return(a:any)=>findOne(t,a)
        if(method==='findFirst')return(a:any)=>findOne(t,a)
        if(method==='findMany')return(a:any)=>findMany(t,a)
        if(method==='create')return(a:any)=>create(t,a)
        if(method==='update')return(a:any)=>update(t,a)
        if(method==='updateMany')return(a:any)=>updateMany(t,a)
        if(method==='delete')return(a:any)=>del(t,a)
        if(method==='deleteMany')return(a:any)=>delMany(t,a)
        if(method==='count')return(a:any)=>count(t,a)
        if(method==='upsert')return async(a:any)=>{const ex=await findOne(t,{where:a.where});return ex?update(t,{where:a.where,data:a.update}):create(t,{data:a.create})}
        return()=>{throw new Error('db.'+model+'.'+method+' not impl')}
      }
    })
  }
})
