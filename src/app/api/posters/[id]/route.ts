import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

const URL_RE = /^https?:\/\/.+/i

function validateLinks(links: unknown): { label: string | null; url: string }[] | null {
  if (!Array.isArray(links)) return []
  const result: { label: string | null; url: string }[] = []
  for (const link of links) {
    if (!link || typeof link !== 'object') continue
    const { label, url } = link as { label?: unknown; url?: unknown }
    if (typeof url !== 'string' || !URL_RE.test(url)) return null
    result.push({
      label: typeof label === 'string' && label.trim() ? label.trim() : null,
      url: url.trim(),
    })
  }
  return result
}

export async function PATCH(
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

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.image_url !== undefined) {
      if (typeof body.image_url !== 'string' || !URL_RE.test(body.image_url.trim())) {
        return NextResponse.json({ error: 'Invalid poster URL' }, { status: 400 })
      }
      updates.image_url = body.image_url.trim()
    }

    if (body.links !== undefined) {
      const validatedLinks = validateLinks(body.links)
      if (!validatedLinks) {
        return NextResponse.json({ error: 'Invalid links' }, { status: 400 })
      }
      updates.links = validatedLinks
    }

    if (body.position !== undefined) {
      if (typeof body.position !== 'number' || !Number.isInteger(body.position)) {
        return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
      }
      updates.position = body.position
    }

    const serviceClient = await createServiceClient()

    const { data: poster } = await serviceClient
      .from('entry_posters')
      .select('entry_id')
      .eq('id', id)
      .single()

    if (!poster) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: entry } = await serviceClient
      .from('entries')
      .select('id, user_id')
      .eq('id', poster.entry_id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await serviceClient
      .from('entry_posters')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (updates.image_url && body.make_main) {
      await serviceClient.from('entries').update({ custom_poster_url: data.image_url }).eq('id', entry.id)
    }

    return NextResponse.json({ poster: data })
  } catch (error) {
    console.error('PATCH /api/posters/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { data: poster } = await serviceClient
      .from('entry_posters')
      .select('entry_id')
      .eq('id', id)
      .single()

    if (!poster) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: entry } = await serviceClient
      .from('entries')
      .select('id, user_id')
      .eq('id', poster.entry_id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await serviceClient
      .from('entry_posters')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/posters/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}