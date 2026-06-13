import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { searchBestMatch, searchBestMatchMulti, getTMDBDetails } from '@/lib/tmdb'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entries } = body

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Entries array is required' }, { status: 400 })
    }

    const validEntries = entries.map((e: Record<string, unknown>) => ({
      user_id: user.id,
      title: String(e.title || '').trim(),
      type: ['movie', 'series'].includes(e.type as string) ? e.type as string : 'movie',
      status: ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'].includes(e.status as string)
        ? e.status as string : 'completed',
      rating: e.rating && !isNaN(Number(e.rating)) ? Math.min(10, Math.max(1, Math.round(Number(e.rating)))) : null,
      watch_date: (e.watch_date as string) || null,
      notes: (e.notes as string) || null,
      year: e.year && !isNaN(Number(e.year)) ? Number(e.year) : null,
      poster_path: (e.poster_path as string) || null,
      tmdb_id: e.tmdb_id ? Number(e.tmdb_id) : null,
      genres: Array.isArray(e.genres) ? e.genres : null,
      overview: (e.overview as string) || null,
      badge: (e.badge as string) || null,
    })).filter((e) => e.title.length > 0)

    if (validEntries.length === 0) {
      return NextResponse.json({ error: 'No valid entries to import' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: existing } = await serviceClient
      .from('entries')
      .select('title, year')
      .eq('user_id', user.id)

    const existingSet = new Set(
      (existing || []).map(e => `${e.title.toLowerCase()}|${e.year || ''}`)
    )

    const newEntries = validEntries.filter(e => {
      const key = `${e.title.toLowerCase()}|${e.year || ''}`
      return !existingSet.has(key)
    })

    let duplicates = validEntries.length - newEntries.length

    if (newEntries.length === 0) {
      return NextResponse.json({
        imported: 0,
        duplicates,
        total: validEntries.length,
        message: `${duplicates} duplicate(s) found, nothing new to import`,
      })
    }

    const { data, error } = await serviceClient
      .from('entries')
      .insert(newEntries)
      .select()

    if (error) throw error

    let postersFetched = 0
    for (const entry of data) {
      if (entry.poster_path) continue
      try {
        let result = null
        if (entry.tmdb_id) {
          result = await getTMDBDetails(entry.tmdb_id, entry.type as 'movie' | 'series')
        } else {
          result = await searchBestMatch(entry.title, entry.year, entry.type as 'movie' | 'series')
          if (!result || !result.poster_path) {
            result = await searchBestMatchMulti(entry.title, entry.year)
          }
        }
        if (result) {
          await serviceClient
            .from('entries')
            .update({
              poster_path: result.poster_path || undefined,
              tmdb_id: result.tmdb_id || undefined,
              year: result.year || entry.year,
              overview: result.overview || null,
              runtime: result.runtime || null,
              tagline: result.tagline || null,
              cast_crew: result.cast_crew || null,
            })
            .eq('id', entry.id)
          postersFetched++
        }
        await new Promise(r => setTimeout(r, 200))
      } catch {}
    }

    return NextResponse.json({
      imported: data.length,
      duplicates,
      total: validEntries.length,
      posters_fetched: postersFetched,
      entries: data,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
