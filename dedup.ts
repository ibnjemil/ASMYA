import {db} from './src/lib/db'
async function main(){
  const chats=await db.chat.findMany({orderBy:[{name:'asc'},{side:'asc'},{type:'asc'},{createdAt:'asc'}]})
  const seen=new Map(), del:string[]=[]
  for(const c of chats){const k=c.name+'|'+c.side+'|'+c.type;if(seen.has(k)){del.push(c.id)}else{seen.set(k,c.id)}}
  if(!del.length){console.log('No duplicates found');return}
  console.log('Deleting '+del.length+' duplicate chats:',del)
  const m=await db.chatMember.deleteMany({where:{chatId:{in:del}}})
  console.log('Deleted '+m.count+' members')
  const c2=await db.chat.deleteMany({where:{id:{in:del}}})
  console.log('Deleted '+c2.count+' chats')
}
main().catch(console.error).finally(()=>db.$disconnect())
