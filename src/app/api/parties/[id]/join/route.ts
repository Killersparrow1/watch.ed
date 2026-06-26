import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = await createServiceClient()

    const { data: party } = await serviceClient
      .from('watch_parties')
      .select('host_id, title')
      .eq('id', id)
      .single()

    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    const { data: existing } = await serviceClient
      .from('watch_party_participants')
      .select('id, status')
      .eq('party_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'declined') {
        await serviceClient
          .from('watch_party_participants')
          .update({ status: 'accepted' })
          .eq('id', existing.id)
      }
      return NextResponse.json({ action: 'already_joined' })
    }

    await serviceClient
      .from('watch_party_participants')
      .insert({ party_id: id, user_id: user.id, status: 'accepted' })

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    const name = profile?.display_name || profile?.username || 'Someone'
    const msg = `${name} joined your watch party: ${party.title}`
    await serviceClient.from('notifications').insert({
      user_id: party.host_id,
      type: 'party',
      message: msg,
      link: `/dashboard/parties/${id}`,
    }).maybeSingle()
    sendPushNotification(party.host_id, 'Watch party', msg, `/dashboard/parties/${id}`)

    return NextResponse.json({ action: 'joined' }, { status: 201 })
  } catch (error) {
    console.error('POST /api/parties/[id]/join error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
