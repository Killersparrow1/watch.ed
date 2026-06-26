import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { data: follows } = await serviceClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (follows || []).map(f => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ entries: [] })
    }

    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followingIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const { data: entries, error } = await serviceClient
      .from('entries')
      .select('*')
      .in('user_id', followingIds)
      .neq('status', 'plan_to_watch')
      .order('watch_date', { ascending: false, nullsFirst: false })

    if (error) throw error

    const enriched = (entries || []).map(e => ({
      ...e,
      profile: profileMap.get(e.user_id) || null,
    }))

    return NextResponse.json({ entries: enriched })
  } catch (error) {
    console.error('GET /api/feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
