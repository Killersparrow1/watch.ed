import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (entriesError) throw entriesError

    const entryIds = (entries || []).map(e => e.id)

    const { data: reactions } = await supabase
      .from('reactions')
      .select('entry_id, reaction')
      .in('entry_id', entryIds.length > 0 ? entryIds : ['none'])

    const reactionCounts: Record<string, { likes: number; dislikes: number }> = {}
    for (const entry of entries || []) {
      reactionCounts[entry.id] = { likes: 0, dislikes: 0 }
    }
    for (const r of reactions || []) {
      if (reactionCounts[r.entry_id]) {
        if (r.reaction === 'like') reactionCounts[r.entry_id].likes++
        else reactionCounts[r.entry_id].dislikes++
      }
    }

    const entriesWithReactions = (entries || []).map(entry => ({
      ...entry,
      likes: reactionCounts[entry.id]?.likes || 0,
      dislikes: reactionCounts[entry.id]?.dislikes || 0,
    }))

    return NextResponse.json({ profile, entries: entriesWithReactions })
  } catch (error) {
    console.error('GET /api/export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
