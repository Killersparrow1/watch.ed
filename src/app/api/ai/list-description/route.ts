import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateText, AiError, aiErrorMessage } from '@/lib/ai'
import { getAiCaller, requireOwner, enforceAiLimit, getAiCache, setAiCache, cacheKeyFor } from '@/lib/ai-guard'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listId } = body
    if (!listId || typeof listId !== 'string') {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 })
    }

    const caller = await getAiCaller()
    await enforceAiLimit(caller)

    const serviceClient = await createServiceClient()

    const { data: list } = await serviceClient
      .from('lists')
      .select('id, user_id, name, description')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    await requireOwner(list.user_id, caller)

    const cacheKey = cacheKeyFor('list-desc', listId)
    const cached = await getAiCache(cacheKey)
    if (cached) {
      return NextResponse.json({ description: cached, cached: true })
    }

    const { data: rows } = await serviceClient
      .from('list_entries')
      .select('entries(title)')
      .eq('list_id', listId)
      .order('position', { ascending: true })
      .limit(12)

    const titles = ((rows || []) as unknown as { entries: { title: string } | null }[])
      .map(r => r.entries?.title)
      .filter(Boolean)

    if (titles.length === 0) {
      return NextResponse.json({ error: 'Add entries to this list first' }, { status: 400 })
    }

    const prompt = `Write a short, warm description (2-3 sentences) for a curated movie/series list named "${list.name}" containing: ${titles.join(', ')}.
Match the tone of an enthusiastic but personal cinephile. Do not list every title — describe the vibe and what connects them. Do not mention that an AI wrote it. Return only the description.`

    const description = await generateText(prompt)
    await setAiCache(cacheKey, description)

    return NextResponse.json({ description })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : error.code === 'quota' ? 429 : 502
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('POST /api/ai/list-description error:', error)
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
  }
}