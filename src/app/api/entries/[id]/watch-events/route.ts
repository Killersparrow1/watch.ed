import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: events } = await serviceClient
      .from('watch_events')
      .select('*')
      .eq('entry_id', id)
      .order('watch_date', { ascending: false })
      .order('created_at', { ascending: false })

    return NextResponse.json({ events: events || [] })
  } catch (error) {
    console.error('GET /api/entries/[id]/watch-events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { watch_date, notes, rating, season_number, episode_number, episode_title } = body

    if (!watch_date) {
      return NextResponse.json({ error: 'watch_date is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let validatedRating: number | null = null
    if (rating !== null && rating !== undefined) {
      const r = Number(rating)
      if (!isNaN(r) && r >= 1 && r <= 10) {
        validatedRating = Math.round(r)
      } else {
        return NextResponse.json({ error: 'Rating must be between 1 and 10' }, { status: 400 })
      }
    }

    const { data, error } = await serviceClient
      .from('watch_events')
      .insert({
        entry_id: id,
        watch_date,
        notes: notes || null,
        rating: validatedRating,
        season_number: season_number || null,
        episode_number: episode_number || null,
        episode_title: episode_title || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ event: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/entries/[id]/watch-events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
