let _d:any
function mk(){var u=process.env.ASMYA_DB_URL;if(u)process.env.DATABASE_URL=u
var P=require("@prisma/client").PrismaClient
var c=require("@libsql/client").createClient({url:u})
var a=new(require("@prisma/adapter-libsql").PrismaLibSQL)(c);return new P({adapter:a})}
function g(){if(!_d)_d=mk();return _d}
export const db=new Proxy({}as any,{get(_,p){return g()[p]}})
