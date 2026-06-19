import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

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

    const { data: event } = await serviceClient
      .from('watch_events')
      .select('entry_id')
      .eq('id', id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', event.entry_id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await serviceClient
      .from('watch_events')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/watch-events/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
