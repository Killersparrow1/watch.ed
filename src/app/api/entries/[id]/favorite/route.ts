import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

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

    const serviceClient = await createServiceClient()

    const { data: entry, error: fetchError } = await serviceClient
      .from('entries')
      .select('favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const newFavorite = !entry.favorite

    const { error: updateError } = await serviceClient
      .from('entries')
      .update({ favorite: newFavorite })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ favorite: newFavorite })
  } catch (error) {
    console.error('POST /api/entries/[id]/favorite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
