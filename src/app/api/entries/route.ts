import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const favorite = searchParams.get('favorite')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const search = searchParams.get('search')
    const tmdbId = searchParams.get('tmdb_id')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    let query = serviceClient
      .from('entries')
      .select('*')
      .eq('user_id', user.id)

    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    if (favorite) query = query.eq('favorite', true)
    if (search) query = query.ilike('title', `%${search}%`)
    if (tmdbId) query = query.eq('tmdb_id', parseInt(tmdbId))

    const allowedSorts = ['watch_date', 'title', 'rating', 'year']
    const sortCol = allowedSorts.includes(sort) ? sort : 'watch_date'
    const sortOrder = order === 'asc' ? true : false
    if (sortCol === 'watch_date') {
      query = query.order(sortCol, { ascending: sortOrder, nullsFirst: false })
    } else {
      query = query.order(sortCol, { ascending: sortOrder })
    }

    if (limit) query = query.limit(parseInt(limit))
    if (offset) query = query.range(parseInt(offset), parseInt(offset) + (limit ? parseInt(limit) - 1 : 9999))

    const { data: entries, error } = await query

    if (error) throw error

    return NextResponse.json({ entries: entries || [] })
  } catch (error) {
    console.error('GET /api/entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { error } = await serviceClient
      .from('entries')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/entries error:', error)
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
    const { title, type, status, rating, progress_season, progress_episode, watch_date, notes, tmdb_id, imdb_id, poster_path, year, genres, overview, badge, runtime, tagline, cast_crew, custom_poster_url, watch_providers, download_url } = body

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 })
    }

    if (!['movie', 'series'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const validStatuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (rating !== null && rating !== undefined) {
      const r = Number(rating)
      if (!Number.isInteger(r) || r < 1 || r > 10) {
        return NextResponse.json({ error: 'Rating must be an integer between 1 and 10' }, { status: 400 })
      }
    }

    if (badge && !['golden', 'absolute appi', 'MalamCult', 'wammale cinema'].includes(badge)) {
      return NextResponse.json({ error: 'Invalid badge' }, { status: 400 })
    }

    if (custom_poster_url && !/^https?:\/\/.+/.test(custom_poster_url)) {
      return NextResponse.json({ error: 'Invalid poster URL' }, { status: 400 })
    }

    if (download_url) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Only admins can set download links' }, { status: 403 })
      }
    }

    const record: Record<string, unknown> = {
      user_id: user.id,
      title: title.trim(),
      type,
      status: status || 'plan_to_watch',
      rating: rating || null,
      progress_season: progress_season || null,
      progress_episode: progress_episode || null,
      watch_date: watch_date || null,
      notes: notes || null,
      tmdb_id: tmdb_id || null,
      imdb_id: imdb_id || null,
      poster_path: poster_path || null,
      year: year || null,
      genres: genres || null,
      overview: overview || null,
      badge: badge || null,
      runtime: runtime || null,
      tagline: tagline || null,
      cast_crew: cast_crew || null,
      watch_providers: watch_providers || [],
      download_url: download_url || null,
    }
    if (custom_poster_url) record.custom_poster_url = custom_poster_url

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('entries')
      .insert(record)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
