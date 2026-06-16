import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entry_id, reaction } = body

    if (!entry_id || !reaction) {
      return NextResponse.json({ error: 'entry_id and reaction are required' }, { status: 400 })
    }

    if (!['like', 'dislike'].includes(reaction)) {
      return NextResponse.json({ error: 'Reaction must be "like" or "dislike"' }, { status: 400 })
    }

    const visitorId = getVisitorId(request)
    if (!visitorId) {
      return NextResponse.json({ error: 'Could not identify visitor' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const authSupabase = await createServerSupabaseClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    const authenticatedUserId = user?.id

    const { data: existing } = await supabase
      .from('reactions')
      .select('*')
      .eq('entry_id', entry_id)
      .eq('visitor_id', visitorId)
      .maybeSingle()

    const { data: entry } = await supabase
      .from('entries')
      .select('user_id, title')
      .eq('id', entry_id)
      .single()

    const isOwnEntry = authenticatedUserId && entry && entry.user_id === authenticatedUserId

    if (existing) {
      if (existing.reaction === reaction) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id)

        if (error) throw error
        return NextResponse.json({ action: 'removed', reaction: null })
      }

      const { data, error } = await supabase
        .from('reactions')
        .update({ reaction })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error

      if (!isOwnEntry && entry) {
        const label = reaction === 'like' ? 'liked' : 'disliked'
        await supabase.from('notifications').insert({
          user_id: entry.user_id,
          type: 'reaction',
          message: `Someone ${label} your entry: ${entry.title}`,
        }).maybeSingle()
      }

      return NextResponse.json({ action: 'updated', reaction: data })
    }

    const { data, error } = await supabase
      .from('reactions')
      .insert({ entry_id, visitor_id: visitorId, reaction })
      .select()
      .single()

    if (error) throw error

    if (!isOwnEntry && entry) {
      const label = reaction === 'like' ? 'liked' : 'disliked'
      await supabase.from('notifications').insert({
        user_id: entry.user_id,
        type: 'reaction',
        message: `Someone ${label} your entry: ${entry.title}`,
      }).maybeSingle()
    }

    return NextResponse.json({ action: 'created', reaction: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reactions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getVisitorId(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''

  const raw = `${ip}|${userAgent}|${acceptLanguage}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `v_${Math.abs(hash).toString(36)}`
}
