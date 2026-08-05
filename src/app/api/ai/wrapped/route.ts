import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateText, AiError, aiErrorMessage } from '@/lib/ai'
import { getAiCaller, enforceAiLimit, getAiCache, setAiCache, cacheKeyFor } from '@/lib/ai-guard'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const year = Number(body.year)
    if (!year) {
      return NextResponse.json({ error: 'year is required' }, { status: 400 })
    }

    const caller = await getAiCaller()
    await enforceAiLimit(caller)

    const cacheKey = cacheKeyFor('wrapped', caller.userId, year)
    const cached = await getAiCache(cacheKey)
    if (cached) {
      return NextResponse.json({ text: cached, cached: true })
    }

    const serviceClient = await createServiceClient()

    const { data: entries } = await serviceClient
      .from('entries')
      .select('title, type, rating, genres, watch_date, runtime, progress_episode')
      .eq('user_id', caller.userId)
      .gte('watch_date', `${year}-01-01`)
      .lte('watch_date', `${year}-12-31`)

    const list = entries || []

    if (list.length === 0) {
      return NextResponse.json({ error: `No entries for ${year}` }, { status: 400 })
    }

    const rated = list.filter(e => e.rating)
    const avgRating = rated.length
      ? (rated.reduce((s, e) => s + (e.rating || 0), 0) / rated.length).toFixed(1)
      : null

    const genreCount: Record<string, number> = {}
    const { data: genreRows } = await serviceClient
      .from('entries')
      .select('genres')
      .eq('user_id', caller.userId)
      .gte('watch_date', `${year}-01-01`)
      .lte('watch_date', `${year}-12-31`)

    for (const row of (genreRows || []) as { genres: string[] | null }[]) {
      if (row.genres) row.genres.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1 })
    }
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]

    const monthly: number[] = Array(12).fill(0)
    for (const e of list) {
      if (e.watch_date) {
        const m = new Date(e.watch_date).getMonth()
        if (!isNaN(m)) monthly[m]++
      }
    }
    const peakMonths = monthly
      .map((c, i) => ({ c, m: new Date(2000, i).toLocaleString('en', { month: 'long' }) }))
      .filter(x => x.c > 0)
      .sort((a, b) => b.c - a.c)
      .slice(0, 2)

    const best = rated.length > 0
      ? rated.reduce((b, e) => ((e.rating || 0) > (b.rating || 0) ? e : b))
      : null

    const movieMinutes = list.filter(e => e.type === 'movie').reduce((s, e) => s + (e.runtime || 0), 0)
    const seriesMinutes = list
      .filter(e => e.type === 'series' && e.runtime && e.progress_episode)
      .reduce((s, e) => {
        const eps = (e.progress_episode || '').split(/[,;]/).reduce((acc: number, part: string) => {
          const range = part.trim().split('-')
          if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
          if (parseInt(part.trim())) return acc + 1
          return acc
        }, 0)
        return s + (e.runtime || 0) * Math.max(eps, 0)
      }, 0)
    const totalHours = Math.round((movieMinutes + seriesMinutes) / 60)

    const prompt = `Write a fun, warm, personal "year in review" for someone who tracked ${list.length} movies/series in ${year}:
- Best rated: ${best?.title || 'none'} (${best?.rating || '—'}/10)${best ? '' : ''}
- Average rating: ${avgRating || 'unrated'}/10
- Top genre: ${topGenre ? `${topGenre[0]} (${topGenre[1]} titles)` : 'none'}
- Total watch time: ${totalHours}h
- Most active months: ${peakMonths.length > 0 ? peakMonths.map(p => `${p.m} (${p.c} titles)`).join(', ') : 'none'}

Write it in a casual, personal, slightly playful voice celebrating the titles. Keep it 120-180 words, no bullet lists, end with an encouraging one-liner. Do not say it was written by AI. Return only the text.`

    const text = await generateText(prompt)
    await setAiCache(cacheKey, text)

    return NextResponse.json({ text })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : error.code === 'quota' ? 429 : 502
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('POST /api/ai/wrapped error:', error)
    return NextResponse.json({ error: 'Failed to generate your year in review' }, { status: 500 })
  }
}