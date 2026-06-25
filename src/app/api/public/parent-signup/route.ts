import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// POST /api/public/parent-signup — Parent creates their own account, links to existing child
export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName, childUsername } = await req.json()

    if (!username || !password || !displayName || !childUsername) {
      return NextResponse.json(
        { error: 'Username, password, display name, and child username are required' },
        { status: 400 }
      )
    }

    // Check username not taken
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Find the child (student) by username — must already be created by teacher
    const child = await prisma.user.findUnique({
      where: { username: childUsername },
      include: { studentProfile: true },
    })

    if (!child || child.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student account not found. The Ustaz must create the student first.' }, { status: 404 })
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10)

    // Create parent user + profile
    const parent = await prisma.user.create({
      data: {
        username,
        password: hash,
        displayName,
        role: 'PARENT',
        side: child.side, // same side as child
      },
    })

    await prisma.parentProfile.create({
      data: { userId: parent.id },
    })

    // Link child to parent
    await prisma.studentProfile.update({
      where: { userId: child.id },
      data: { parentId: parent.id },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: parent.id,
        username: parent.username,
        displayName: parent.displayName,
        role: parent.role,
        side: parent.side,
      },
    }, { status: 201 })
  } catch (e: any) {
    console.error('Parent signup error:', e)
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}