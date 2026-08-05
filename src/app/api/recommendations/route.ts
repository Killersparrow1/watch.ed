import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { getPosterUrl } from '@/lib/tmdb'
import { sendPushNotification } from '@/lib/push'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function tmdbFetch(path: string) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return null
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')
  const res = await fetch(url.toString())
  if (!res.ok) return null
  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const [incomingRes, sentRes, entriesRes] = await Promise.all([
      serviceClient
        .from('recommendations')
        .select('*, from_user_id!inner(profiles!inner(username, display_name, avatar_url))')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('recommendations')
        .select('*, to_user_id!inner(profiles!inner(username, display_name, avatar_url))')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('entries')
        .select('title, tmdb_id, type, rating')
        .eq('user_id', user.id),
    ])

    const existingTmdbIds = new Set((entriesRes.data || []).map(e => e.tmdb_id).filter(Boolean))

    let tmdbSuggestions: Record<string, unknown>[] = []

    if (type === 'all' || type === 'tmdb') {
      const withId = (entriesRes.data || []).filter(e => e.tmdb_id)
      const rated = withId.filter(e => e.rating)
      const topRated = (rated.length > 0 ? rated : withId)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)

      const seen = new Set<number>()
      const suggestions: Record<string, unknown>[] = []

      for (const entry of topRated) {
        const data = await tmdbFetch(
          `/${entry.type === 'series' ? 'tv' : 'movie'}/${entry.tmdb_id}/recommendations`
        ) as { results?: { id: number; title?: string; name?: string; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number }[] } | null

        if (!data?.results) continue

        for (const r of data.results) {
          if (seen.has(r.id) || existingTmdbIds.has(r.id)) continue
          seen.add(r.id)
          suggestions.push({
            tmdb_id: r.id,
            title: r.title || r.name || '',
            poster_path: r.poster_path || null,
            poster_url: getPosterUrl(r.poster_path || null, 'w185'),
            year: (r.release_date || r.first_air_date || '').slice(0, 4) || null,
            rating: r.vote_average ? Math.round(r.vote_average) : null,
          })
        }
      }

      tmdbSuggestions = suggestions.slice(0, 20)
    }

    return NextResponse.json({
      incoming: incomingRes.data || [],
      sent: sentRes.data || [],
      tmdb: tmdbSuggestions,
    })
  } catch (error) {
    console.error('GET /api/recommendations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to_user_id, entry_id, tmdb_id, title, type, poster_path, year, message } = body

    if (!to_user_id || (!entry_id && !tmdb_id && !title)) {
      return NextResponse.json({ error: 'Recipient and at least one identifier required' }, { status: 400 })
    }

    if (to_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot recommend to yourself' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', to_user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: rec, error } = await serviceClient
      .from('recommendations')
      .insert({
        from_user_id: user.id,
        to_user_id,
        entry_id: entry_id || null,
        tmdb_id: tmdb_id || null,
        title,
        type: type || null,
        poster_path: poster_path || null,
        year: year || null,
        message: message || null,
      })
      .select()
      .single()

    if (error) throw error

    const { data: fromProfile } = await serviceClient
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    await serviceClient
      .from('notifications')
      .insert({
        user_id: to_user_id,
        type: 'recommendation',
        message: `${fromProfile?.display_name || 'Someone'} recommended "${title}"`,
        link: '/dashboard/recommendations',
      })

    sendPushNotification(
      to_user_id,
      'New recommendation',
      `${fromProfile?.display_name || 'Someone'} recommended "${title}"`,
      '/dashboard/recommendations',
    )

    return NextResponse.json({ recommendation: rec }, { status: 201 })
  } catch (error) {
    console.error('POST /api/recommendations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
