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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('GET /api/entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const allowedFields = [
      'title', 'type', 'status', 'rating', 'progress_season', 'progress_episode',
      'watch_date', 'notes', 'tmdb_id', 'poster_path', 'year', 'genres', 'overview', 'badge', 'runtime'
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (updates.title !== undefined && typeof updates.title === 'string' && !updates.title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }

    if (updates.type && typeof updates.type === 'string' && !['movie', 'series'].includes(updates.type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const validStatuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
    if (updates.status && typeof updates.status === 'string' && !validStatuses.includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (updates.rating !== null && updates.rating !== undefined) {
      const r = Number(updates.rating)
      if (!Number.isInteger(r) || r < 1 || r > 10) {
        return NextResponse.json({ error: 'Rating must be an integer between 1 and 10' }, { status: 400 })
      }
    }

    if (updates.badge && typeof updates.badge === 'string' && !['golden', 'shit'].includes(updates.badge)) {
      return NextResponse.json({ error: 'Invalid badge' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('PATCH /api/entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const serviceClient = await createServiceClient()
    const { error } = await serviceClient
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
