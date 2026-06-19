import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ entries: [], profiles: [] })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const serviceClient = await createServiceClient()

    const query = `%${q}%`

    const [entriesRes, profilesRes, userEntriesRes] = await Promise.all([
      serviceClient
        .from('entries')
        .select('id, title, type, year, poster_path, rating, status, user_id')
        .or(`title.ilike.${query},tagline.ilike.${query}`)
        .limit(20),
      serviceClient
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .or(`username.ilike.${query},display_name.ilike.${query}`)
        .limit(10),
      user
        ? serviceClient
            .from('entries')
            .select('id, title, type, year, poster_path, rating, status, user_id')
            .or(`title.ilike.${query},tagline.ilike.${query}`)
            .eq('user_id', user.id)
            .limit(10)
        : Promise.resolve({ data: [] }),
    ])

    return NextResponse.json({
      entries: entriesRes.data || [],
      profiles: profilesRes.data || [],
      myEntries: userEntriesRes.data || [],
    })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
