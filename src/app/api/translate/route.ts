import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

const MAX_TEXTS = 20

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { texts, from, to } = body

    if (!texts || !Array.isArray(texts) || texts.length === 0 || !from || !to) {
      return NextResponse.json({ error: 'Missing required fields: texts, from, to' }, { status: 400 })
    }

    if (texts.length > MAX_TEXTS) {
      return NextResponse.json({ error: `Maximum ${MAX_TEXTS} texts allowed per request` }, { status: 400 })
    }

    const zai = await ZAI.create()

    const translations = await Promise.all(
      texts.map(async (text: string) => {
        try {
          const result = await zai.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `You are a professional translator. Translate the following text from "${from}" to "${to}". Return ONLY the translated text, nothing else. Do not add explanations, notes, or formatting.`,
              },
              {
                role: 'user',
                content: text,
              },
            ],
          })

          return result?.choices?.[0]?.message?.content || result?.content || text
        } catch {
          return text // Return original text on failure
        }
      })
    )

    return NextResponse.json({ translations })
  } catch (error) {
    console.error('POST translate error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
