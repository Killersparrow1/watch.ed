import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const browse = searchParams.get('browse') === 'true'

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = await createServiceClient()

    if (browse) {
      const { data: hosted } = await serviceClient
        .from('watch_parties')
        .select('id')
        .eq('host_id', user.id)

      const { data: joined } = await serviceClient
        .from('watch_party_participants')
        .select('party_id')
        .eq('user_id', user.id)

      const excludeIds = new Set([
        ...(hosted || []).map(p => p.id),
        ...(joined || []).map(p => p.party_id),
      ])

      let query = serviceClient
        .from('watch_parties')
        .select('*')
        .eq('is_public', true)
        .in('status', ['planned', 'watching'])
        .order('watch_date', { ascending: true })

      const { data: parties } = await query

      const filtered = (parties || []).filter(p => !excludeIds.has(p.id))

      const partyIds = filtered.map(p => p.id)
      const [participantsRes, hostsRes] = await Promise.all([
        serviceClient
          .from('watch_party_participants')
          .select('party_id, status')
          .in('party_id', partyIds),
        serviceClient
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', filtered.map(p => p.host_id)),
      ])

      const hostMap = new Map((hostsRes.data || []).map(h => [h.id, h]))
      const counts: Record<string, { accepted: number; total: number }> = {}
      for (const p of participantsRes.data || []) {
        if (!counts[p.party_id]) counts[p.party_id] = { accepted: 0, total: 0 }
        counts[p.party_id].total++
        if (p.status === 'accepted') counts[p.party_id].accepted++
      }

      return NextResponse.json({
        parties: filtered.map(p => ({
          ...p,
          host: hostMap.get(p.host_id) || null,
          participant_count: counts[p.id] || { accepted: 0, total: 0 },
        })),
      })
    }

    const [hostedRes, participantRes] = await Promise.all([
      serviceClient
        .from('watch_parties')
        .select('*')
        .eq('host_id', user.id)
        .order('watch_date', { ascending: false }),
      serviceClient
        .from('watch_party_participants')
        .select('*, watch_parties(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const hosted = hostedRes.data || []
    const joined = (participantRes.data || [])
      .filter(p => p.watch_parties && p.watch_parties.host_id !== user.id)
      .map(p => p.watch_parties)

    const all = [...hosted, ...joined]
    const unique = all.filter((p, i, a) => a.findIndex(x => x.id === p.id) === i)

    const partyIds = unique.map(p => p.id)
    const { data: participants } = await serviceClient
      .from('watch_party_participants')
      .select('*, profiles!inner(id, username, display_name, avatar_url)')
      .in('party_id', partyIds)

    const participantsByParty: Record<string, unknown[]> = {}
    for (const p of participants || []) {
      if (!participantsByParty[p.party_id]) participantsByParty[p.party_id] = []
      participantsByParty[p.party_id].push(p)
    }

    const enriched = unique.map(p => ({
      ...p,
      participants: participantsByParty[p.id] || [],
    }))

    return NextResponse.json({ parties: enriched })
  } catch (error) {
    console.error('GET /api/parties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, tmdb_id, media_type, poster_path, year, watch_date, notes, stream_url } = body

    if (!title || !watch_date) {
      return NextResponse.json({ error: 'Title and watch date are required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('watch_parties')
      .insert({
        host_id: user.id,
        title: title.trim(),
        tmdb_id: tmdb_id || null,
        media_type: media_type || null,
        poster_path: poster_path || null,
        year: year || null,
        watch_date,
        notes: notes || null,
        stream_url: stream_url || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ party: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/parties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
