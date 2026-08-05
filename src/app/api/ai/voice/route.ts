import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateText, AiError, aiErrorMessage } from '@/lib/ai'
import { getAiCaller, enforceAiLimit } from '@/lib/ai-guard'

const MAX_SAMPLES = 6
const MIN_SHORT = 3

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, title, year, type, genres, excludeEntryId } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Write a rough draft first' }, { status: 400 })
    }

    const caller = await getAiCaller()
    await enforceAiLimit(caller)

    const serviceClient = await createServiceClient()

    const samplesQuery = serviceClient
      .from('entries')
      .select('title, notes')
      .eq('user_id', caller.userId)
      .not('notes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(MAX_SAMPLES + 1)

    if (excludeEntryId) {
      samplesQuery.neq('id', excludeEntryId)
    }

    const { data: samples } = await samplesQuery
    const sampleNotes = (samples || [])
      .map(s => (s.notes || '').trim())
      .filter(n => n.length > 20)
      .slice(0, MAX_SAMPLES)

    const isLazy = text.trim().split(/\s+/).length < MIN_SHORT
    const genreStr = Array.isArray(genres) && genres.length ? genres.join(', ') : ''
    const what = `${title}${year ? ` (${year})` : ''}${genreStr ? ` — ${genreStr}` : ''}${type ? ` [${type}]` : ''}`

    const styleBlock = sampleNotes.length > 0
      ? `Here are reviews this person previously wrote. Learn their voice: casual tone, favorite expressions, how they open, humor, emojis, signature phrases.\n\n${sampleNotes.map(n => `- "${n.slice(0, 500)}"`).join('\n')}`
      : `The person has no past reviews on file, so write in a warm, casual, personal cinephile voice with light humor and a few emojis.`

    const prompt = `You are ghost-writing a review for a specific person on " ${what}".
${styleBlock}

The person jotted a ${isLazy ? 'very short, lazy' : 'rough'} note about the title:
"${text.trim()}"

Expand "${text.trim()}" into a full, natural review (90-160 words) of "${what}" in THIS person's voice — do NOT sound like a generic critic, keep their phrasing and rhythms, weave the notes they wrote into the review, and fill in the rest with authentic, personal enthusiasm. Keep any emojis/quotes/signature phrases they used. Return only the finished review, nothing else.`

    const review = await generateText(prompt)

    return NextResponse.json({ text: review })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : error.code === 'quota' ? 429 : 502
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('POST /api/ai/voice error:', error)
    return NextResponse.json({ error: 'Failed to write in your voice' }, { status: 500 })
  }
}