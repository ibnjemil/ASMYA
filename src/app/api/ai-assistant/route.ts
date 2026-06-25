import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { Role } from '@prisma/client'

export const runtime = 'nodejs'

function buildSystemPrompt(role: string, side: string): string {
  const roleStr = role as Role
  const sideNote = `You are assisting the ${side} side of the ASMYA organization.`

  if (roleStr === Role.SUPERIOR_AMIR) {
    return `You are a strategic AI advisor for the Superior Amir (Ustaz Jihad) of ASMYA. You have full access to all organizational data and provide high-level strategic guidance. ${sideNote} Provide comprehensive, well-structured advice on organizational management, planning, finance, community engagement, and Islamic leadership.`
  }

  return `You are an AI assistant for the ASMYA organization. You are assisting a user with the role of ${roleStr} on the ${side} side. ${sideNote} Provide helpful, accurate responses. Be respectful of Islamic values and organizational structure. Focus your responses on topics relevant to the user's role.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, userId, role, side } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0 || !userId || !role || !side) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const startTime = Date.now()

    const systemPrompt = buildSystemPrompt(role, side)

    // Prepend system prompt to the message array
    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ]

    const zai = await ZAI.create()
    const result = await zai.chat.completions.create({
      messages: fullMessages,
    })

    const responseText =
      result?.choices?.[0]?.message?.content ||
      result?.content ||
      typeof result === 'string'
        ? result
        : JSON.stringify(result)

    const responseTimeMs = Date.now() - startTime

    // Log usage
    const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').pop()
    await db.aiUsage.create({
      data: {
        userId,
        query: lastUserMsg?.content || '(multi-turn)',
        category: 'general',
        language: 'en',
        side,
        responseTimeMs,
      },
    })

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('POST ai-assistant error:', error)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
