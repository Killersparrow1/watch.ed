import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

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
    })).filter((e) => e.title.length > 0)

    if (validEntries.length === 0) {
      return NextResponse.json({ error: 'No valid entries to import' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('entries')
      .insert(validEntries)
      .select()

    if (error) throw error

    return NextResponse.json({
      imported: data.length,
      total: validEntries.length,
      entries: data,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
