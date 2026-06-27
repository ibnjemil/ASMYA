import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName, role, childUsername } = await req.json()
    if (!username||!password||!displayName||!role) return NextResponse.json({error:'All fields are required'},{status:400})
    if (!['STUDENT','PARENT'].includes(role)) return NextResponse.json({error:'Role must be STUDENT or PARENT'},{status:400})
    if (password.length<6) return NextResponse.json({error:'Password must be at least 6 characters'},{status:400})
    const existing = await db.user.findUnique({ where:{username} })
    if (existing) return NextResponse.json({error:'Username already taken'},{status:400})
    const pending = await db.signupRequest.findUnique({ where:{username} })
    if (pending) return NextResponse.json({error:'A request with this username is already pending'},{status:400})
    const hashed = await bcrypt.hash(password, 10)
    const request = await db.signupRequest.create({ data:{username,password:hashed,displayName,role,childUsername:childUsername||null,status:'PENDING',updatedAt:new Date()} })
    return NextResponse.json({success:true,request:{id:request.id,username:request.username,displayName:request.displayName,role:request.role,status:request.status}},{status:201})
  } catch(e:any) { console.error('Signup error:',e); return NextResponse.json({error:e.message||'Failed'},{status:500}) }
}
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role!=='TEACHER') return NextResponse.json({error:'Teacher only'},{status:403})
    const status = req.nextUrl.searchParams.get('status')||'PENDING'
    const requests = await db.signupRequest.findMany({ where:{status}, orderBy:{createdAt:'desc'} })
    return NextResponse.json(requests.map((r:any)=>({id:r.id,username:r.username,displayName:r.displayName,role:r.role,childUsername:r.childUsername,status:r.status,createdAt:r.createdAt})))
  } catch(e:any) { return NextResponse.json({error:e.message},{status:500}) }
}
export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role!=='TEACHER') return NextResponse.json({error:'Teacher only'},{status:403})
    const { requestId, action } = await req.json()
    if (!requestId||!['APPROVED','REJECTED'].includes(action)) return NextResponse.json({error:'Invalid request'},{status:400})
    const sr = await db.signupRequest.findUnique({ where:{id:requestId} })
    if (!sr) return NextResponse.json({error:'Request not found'},{status:404})
    if (sr.status!=='PENDING') return NextResponse.json({error:'Already processed'},{status:400})
    if (action==='REJECTED') { await db.signupRequest.update({where:{id:requestId},data:{status:'REJECTED',updatedAt:new Date()}}); return NextResponse.json({success:true}) }
    let linkedChildId = null
    if (sr.role==='PARENT'&&sr.childUsername) { const cu=await db.user.findUnique({where:{username:sr.childUsername}}); if(cu) linkedChildId=cu.id }
    const nu = await db.user.create({ data:{id:crypto.randomUUID(),username:sr.username,password:sr.password,displayName:sr.displayName,role:sr.role,side:'MEN',subAmirId:null} })
    if (sr.role==='STUDENT') { await db.studentProfile.create({data:{userId:nu.id}}) }
    else if (sr.role==='PARENT') {
      await db.parentProfile.create({data:{userId:nu.id}})
      if (linkedChildId) { const cp=await db.studentProfile.findUnique({where:{userId:linkedChildId}}); if(cp) await db.studentProfile.update({where:{userId:linkedChildId},data:{parentId:nu.id}}) }
    }
    await db.signupRequest.update({where:{id:requestId},data:{status:'APPROVED',updatedAt:new Date()}})
    return NextResponse.json({success:true,user:{id:nu.id,username:nu.username,displayName:nu.displayName,role:nu.role}})
  } catch(e:any) { console.error('Approve error:',e); return NextResponse.json({error:e.message||'Failed'},{status:500}) }
}
