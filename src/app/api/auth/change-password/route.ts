import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newPassword } = body

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.password !== currentPassword) {
      return NextResponse.json({ error: 'Wrong current password' }, { status: 401 })
    }

    await db.user.update({
      where: { id: userId },
      data: { password: newPassword },
    })

    return NextResponse.json({ message: 'Password changed' })
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
