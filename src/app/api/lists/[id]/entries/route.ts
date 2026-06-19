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

    const { data: list } = await serviceClient
      .from('lists')
      .select('user_id, is_public')
      .eq('id', id)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner = user && list.user_id === user.id
    if (!list.is_public && !isOwner) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: entries } = await serviceClient
      .from('list_entries')
      .select('entries(*)')
      .eq('list_id', id)
      .order('position', { ascending: true })

    const mappedEntries = ((entries || []) as { entries: unknown }[]).map(le => le.entries).filter(Boolean)

    return NextResponse.json({ entries: mappedEntries })
  } catch (error) {
    console.error('GET /api/lists/[id]/entries error:', error)
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
    const { entry_id } = body

    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: list } = await serviceClient
      .from('lists')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!list || list.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { count } = await serviceClient
      .from('list_entries')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id)

    const { data, error } = await serviceClient
      .from('list_entries')
      .insert({
        list_id: id,
        entry_id,
        position: count || 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Entry already in list' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ list_entry: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/lists/[id]/entries error:', error)
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

    const body = await request.json()
    const { entry_id } = body

    if (!entry_id) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: list } = await serviceClient
      .from('lists')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!list || list.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await serviceClient
      .from('list_entries')
      .delete()
      .eq('list_id', id)
      .eq('entry_id', entry_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/lists/[id]/entries error:', error)
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
    const { entries } = body

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries array is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: list } = await serviceClient
      .from('lists')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!list || list.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    for (const item of entries) {
      await serviceClient
        .from('list_entries')
        .update({ position: item.position })
        .eq('id', item.id)
        .eq('list_id', id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/lists/[id]/entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
