import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const serviceClient = await createServiceClient()

    const { data: messages, error } = await serviceClient
      .from('watch_party_messages')
      .select('*, profiles!inner(id, username, display_name, avatar_url)')
      .eq('party_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
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
