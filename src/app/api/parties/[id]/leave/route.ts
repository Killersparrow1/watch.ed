import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { error } = await serviceClient
      .from('watch_party_participants')
      .delete()
      .eq('party_id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ action: 'left' })
  } catch (error) {
    console.error('POST /api/parties/[id]/leave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
