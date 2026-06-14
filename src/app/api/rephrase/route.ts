import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const prompt = `Rephrase the following movie/show review to sound more polished and clear, but keep the same casual, personal tone, humor, and voice — don't make it sound generic or overly formal. Preserve emojis, quotes, and any signature phrases the user uses. Return ONLY the rephrased text, nothing else. Review: ${text}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini API error:', res.status, err)
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 502 })
    }

    const data = await res.json()
    const rephrased = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!rephrased) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 })
    }

    return NextResponse.json({ rephrased })
  } catch (error) {
    console.error('POST /api/rephrase error:', error)
    return NextResponse.json({ error: 'Failed to rephrase text' }, { status: 500 })
  }
}
