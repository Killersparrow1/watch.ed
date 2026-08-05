import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data: lists, error } = await serviceClient
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    const listIds = (lists || []).map(l => l.id)
    let entryRows: { list_id: string; entries: { poster_path: string | null; custom_poster_url: string | null; title: string } | null }[] = []
    if (listIds.length > 0) {
      const { data } = await serviceClient
        .from('list_entries')
        .select('list_id, position, entries(poster_path, custom_poster_url, title)')
        .in('list_id', listIds)
        .order('position', { ascending: true })
      entryRows = (data || []) as unknown as { list_id: string; entries: { poster_path: string | null; custom_poster_url: string | null; title: string } | null }[]
    }

    const counts: Record<string, number> = {}
    const previews: Record<string, { poster_path: string | null; custom_poster_url: string | null; title: string }[]> = {}
    for (const row of entryRows) {
      counts[row.list_id] = (counts[row.list_id] || 0) + 1
      if (row.entries && (previews[row.list_id] || []).length < 5) {
        ;(previews[row.list_id] ||= []).push(row.entries)
      }
    }

    const listsWithCounts = (lists || []).map(list => ({
      ...list,
      entry_count: counts[list.id] || 0,
      preview_entries: previews[list.id] || [],
    }))

    return NextResponse.json({ lists: listsWithCounts })
  } catch (error) {
    console.error('GET /api/lists error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, is_public } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('lists')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        is_public: is_public !== undefined ? is_public : true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ list: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/lists error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
