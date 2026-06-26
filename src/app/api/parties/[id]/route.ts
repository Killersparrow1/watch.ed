import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const serviceClient = await createServiceClient()

    const { data: party, error } = await serviceClient
      .from('watch_parties')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const { data: participants } = await serviceClient
      .from('watch_party_participants')
      .select('*, profiles!inner(id, username, display_name, avatar_url)')
      .eq('party_id', id)

    const { data: hostProfile } = await serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', party.host_id)
      .single()

    return NextResponse.json({ party: { ...party, host: hostProfile, participants: participants || [] } })
  } catch (error) {
    console.error('GET /api/parties/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const serviceClient = await createServiceClient()

    const { data: party } = await serviceClient
      .from('watch_parties')
      .select('host_id, status')
      .eq('id', id)
      .single()

    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    if (party.host_id !== user.id) return NextResponse.json({ error: 'Only the host can update' }, { status: 403 })

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.watch_date !== undefined) updates.watch_date = body.watch_date
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.status !== undefined) updates.status = body.status
    if (body.tmdb_id !== undefined) updates.tmdb_id = body.tmdb_id
    if (body.media_type !== undefined) updates.media_type = body.media_type
    if (body.poster_path !== undefined) updates.poster_path = body.poster_path
    if (body.year !== undefined) updates.year = body.year
    if (body.stream_url !== undefined) updates.stream_url = body.stream_url
    if (body.is_public !== undefined) updates.is_public = body.is_public

    const { data, error } = await serviceClient
      .from('watch_parties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if ((body.status === 'completed' || body.status === 'cancelled') && party.status !== body.status) {
      await serviceClient
        .from('watch_party_messages')
        .delete()
        .eq('party_id', id)
    }

    return NextResponse.json({ party: data })
  } catch (error) {
    console.error('PATCH /api/parties/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = await createServiceClient()
    const { data: party } = await serviceClient
      .from('watch_parties')
      .select('host_id')
      .eq('id', id)
      .single()

    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    if (party.host_id !== user.id) return NextResponse.json({ error: 'Only the host can delete' }, { status: 403 })

    const { error } = await serviceClient.from('watch_parties').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/parties/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
