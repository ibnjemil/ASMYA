import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { Role } from '@prisma/client'

export const runtime = 'nodejs'

function buildSystemPrompt(role: string, side: string, language: string): string {
  const roleStr = role as Role
  const langNote = language === 'ar' ? 'Respond in Arabic.' : language === 'bm' ? 'Respond in Bambara.' : 'Respond in English.'
  const sideNote = `You are assisting the ${side} side of the ASMYA organization.`

  if (roleStr === Role.SUPERIOR_AMIR) {
    return `You are a strategic AI advisor for the Superior Amir (Ustaz Jihad) of ASMYA. You have full access to all organizational data and provide high-level strategic guidance. ${sideNote} ${langNote} Provide comprehensive, well-structured advice on organizational management, planning, finance, community engagement, and Islamic leadership.`
  }

  return `You are an AI assistant for the ASMYA organization. You are assisting a user with the role of ${roleStr} on the ${side} side. ${sideNote} ${langNote} Provide helpful, accurate responses. Be respectful of Islamic values and organizational structure. Focus your responses on topics relevant to the user's role.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userId, role, side, language } = body

    if (!message || !userId || !role || !side) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const startTime = Date.now()

    const systemPrompt = buildSystemPrompt(role, side, language || 'en')

    const zai = await ZAI.create()
    const result = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    })

    const responseText =
      result?.choices?.[0]?.message?.content ||
      result?.content ||
      typeof result === 'string'
        ? result
        : JSON.stringify(result)

    const responseTimeMs = Date.now() - startTime

    // Log usage to AiUsage table
    await db.aiUsage.create({
      data: {
        userId,
        query: message,
        category: 'general',
        language: language || 'en',
        side,
        responseTimeMs,
      },
    })

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('POST ai-assist error:', error)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
