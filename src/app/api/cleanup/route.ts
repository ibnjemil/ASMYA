import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
export async function POST() {
  try {
    const chats = await db.chat.findMany({orderBy:[{name:'asc'},{side:'asc'},{type:'asc'},{createdAt:'asc'}]})
    const seen = new Map<string,string>(), del:string[]=[]
    for(const c of chats){const k=c.name+'|'+c.side+'|'+c.type;if(seen.has(k)){del.push(c.id)}else{seen.set(k,c.id)}}
    if(!del.length) return NextResponse.json({message:'No duplicates found'})
    const m=await db.chatMember.deleteMany({where:{chatId:{in:del}}})
    const r=await db.chat.deleteMany({where:{id:{in:del}}})
    return NextResponse.json({deletedChats:r.count,deletedMembers:m.count,ids:del})
  }catch(e){return NextResponse.json({error:String(e)},{status:500})}
}
