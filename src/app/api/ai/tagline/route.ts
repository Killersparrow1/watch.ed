import { NextRequest, NextResponse } from 'next/server'
import { generateText, AiError, aiErrorMessage } from '@/lib/ai'
import { getAiCaller, enforceAiLimit } from '@/lib/ai-guard'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, year, type, genres, overview } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const caller = await getAiCaller()
    await enforceAiLimit(caller)

    const genreStr = Array.isArray(genres) && genres.length ? genres.join(', ') : 'unknown'
    const ctx = `${title} (${year || 'year unknown'}) — ${type || 'film'}, ${genreStr}`
    const prompt = `Write ONE short, punchy tagline (a hook line, 5-12 words) that captures the vibe of "${ctx}" for a review written by a passionate watcher.${overview ? ` Context: ${overview.slice(0, 200)}` : ''}
It should feel like a friend convincing you to watch it — casual, personal, no emojis, no quotes, nothing generic. Return only the tagline.`

    const text = await generateText(prompt)

    return NextResponse.json({ text })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : error.code === 'quota' ? 429 : 502
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('POST /api/ai/tagline error:', error)
    return NextResponse.json({ error: 'Failed to suggest a tagline' }, { status: 500 })
  }
}