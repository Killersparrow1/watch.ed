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

export async function GET(
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

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: posters } = await serviceClient
      .from('entry_posters')
      .select('*')
      .eq('entry_id', id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    return NextResponse.json({ posters: posters || [] })
  } catch (error) {
    console.error('GET /api/entries/[id]/posters error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { image_url, links, make_main } = body

    if (typeof image_url !== 'string' || !URL_RE.test(image_url.trim())) {
      return NextResponse.json({ error: 'Invalid poster URL' }, { status: 400 })
    }

    const validatedLinks = validateLinks(links)
    if (!validatedLinks) {
      return NextResponse.json({ error: 'Invalid links' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!entry || entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: countData } = await serviceClient
      .from('entry_posters')
      .select('position')
      .eq('entry_id', id)
      .order('position', { ascending: false })
      .limit(1)

    const position = countData && countData.length > 0 ? (countData[0].position as number) + 1 : 0

    const { data, error } = await serviceClient
      .from('entry_posters')
      .insert({
        entry_id: id,
        image_url: image_url.trim(),
        links: validatedLinks,
        position,
      })
      .select()
      .single()

    if (error) throw error

    if (make_main) {
      await serviceClient.from('entries').update({ custom_poster_url: data.image_url }).eq('id', id)
    }

    return NextResponse.json({ poster: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/entries/[id]/posters error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}