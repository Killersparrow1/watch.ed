import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { following_id } = await request.json()
    if (!following_id) {
      return NextResponse.json({ error: 'following_id is required' }, { status: 400 })
    }

    if (following_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', following_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ action: 'already_following' })
    }

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id })

    if (error) throw error
    return NextResponse.json({ action: 'followed' }, { status: 201 })
  } catch (error) {
    console.error('POST /api/follow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { following_id } = await request.json()
    if (!following_id) {
      return NextResponse.json({ error: 'following_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)

    if (error) throw error
    return NextResponse.json({ action: 'unfollowed' })
  } catch (error) {
    console.error('DELETE /api/follow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
