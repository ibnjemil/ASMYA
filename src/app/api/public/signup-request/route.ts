import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// POST - Create signup request (student or parent)
export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName, role, childUsername } = await req.json()

    if (!username || !password || !displayName || !role) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!['STUDENT', 'PARENT'].includes(role)) {
      return NextResponse.json({ error: 'Role must be STUDENT or PARENT' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if username already taken (user or pending request)
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 400 })

    const pendingRequest = await prisma.signupRequest.findUnique({ where: { username } })
    if (pendingRequest) return NextResponse.json({ error: 'A request with this username is already pending' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)

    const request = await prisma.signupRequest.create({
      data: {
        username,
        password: hashed,
        displayName,
        role,
        childUsername: childUsername || null,
        status: 'PENDING',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, request: { id: request.id, username: request.username, displayName: request.displayName, role: request.role, status: request.status } }, { status: 201 })
  } catch (e: any) {
    console.error('Signup request error:', e)
    return NextResponse.json({ error: e.message || 'Failed to create request' }, { status: 500 })
  }
}

// GET - List pending requests (teacher only)
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const status = req.nextUrl.searchParams.get('status') || 'PENDING'
    const requests = await prisma.signupRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    })

    // Don't send passwords back
    const safe = requests.map(r => ({ id: r.id, username: r.username, displayName: r.displayName, role: r.role, childUsername: r.childUsername, status: r.status, createdAt: r.createdAt }))
    return NextResponse.json(safe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT - Approve or reject a request (teacher only)
export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get('x-public-role')
    if (role !== 'TEACHER') return NextResponse.json({ error: 'Teacher only' }, { status: 403 })

    const { requestId, action } = await req.json()
    if (!requestId || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const signupReq = await prisma.signupRequest.findUnique({ where: { id: requestId } })
    if (!signupReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (signupReq.status !== 'PENDING') return NextResponse.json({ error: 'Already processed' }, { status: 400 })

    if (action === 'REJECTED') {
      await prisma.signupRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', updatedAt: new Date() } })
      return NextResponse.json({ success: true })
    }

    // APPROVE - create the actual user
    let side = 'MEN'
    let subAmirId: string | null = null

    // Check if parent wants to link to a child
    let linkedChildId: string | null = null
    if (signupReq.role === 'PARENT' && signupReq.childUsername) {
      const childUser = await prisma.user.findUnique({ where: { username: signupReq.childUsername } })
      if (childUser) linkedChildId = childUser.id
    }

    const newUser = await prisma.user.create({
      data: {
        username: signupReq.username,
        password: signupReq.password, // already hashed
        displayName: signupReq.displayName,
        role: signupReq.role,
        side,
        subAmirId,
      },
    })

    // Create profile
    if (signupReq.role === 'STUDENT') {
      await prisma.student_profiles.create({ data: { userId: newUser.id, updatedAt: new Date() } })
    } else if (signupReq.role === 'PARENT') {
      await prisma.parent_profiles.create({ data: { userId: newUser.id, updatedAt: new Date() } })

      // Link child if found
      if (linkedChildId) {
        const childProfile = await prisma.student_profiles.findUnique({ where: { userId: linkedChildId } })
        if (childProfile) {
          await prisma.student_profiles.update({ where: { userId: linkedChildId }, data: { parentId: newUser.id, updatedAt: new Date() } })
        }
      }
    }

    // Mark request as approved
    await prisma.signupRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', updatedAt: new Date() } })

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName, role: newUser.role } })
  } catch (e: any) {
    console.error('Approve request error:', e)
    return NextResponse.json({ error: e.message || 'Failed to process request' }, { status: 500 })
  }
}