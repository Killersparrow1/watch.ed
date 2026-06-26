import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const serviceClient = await createServiceClient()

    const { data: messages, error } = await serviceClient
      .from('watch_party_messages')
      .select('*')
      .eq('party_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    const userIds = [...new Set((messages || []).map(m => m.user_id))]
    let profiles: Record<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: p } = await serviceClient
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)
      if (p) {
        for (const profile of p) {
          profiles[profile.id] = profile
        }
      }
    }

    const enriched = (messages || []).map(m => ({ ...m, profiles: profiles[m.user_id] || null }))

    return NextResponse.json({ messages: enriched })
  } catch (error) {
    console.error('GET /api/parties/[id]/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { message } = body
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: party } = await serviceClient
      .from('watch_parties')
      .select('status')
      .eq('id', id)
      .single()

    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    if (party.status === 'completed' || party.status === 'cancelled') {
      return NextResponse.json({ error: 'Party has ended' }, { status: 400 })
    }

    const { data: msg, error } = await serviceClient
      .from('watch_party_messages')
      .insert({ party_id: id, user_id: user.id, message: message.trim() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: msg }, { status: 201 })
  } catch (error) {
    console.error('POST /api/parties/[id]/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
