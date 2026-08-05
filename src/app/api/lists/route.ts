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

    const listsWithCounts = await Promise.all(
      (lists || []).map(async (list) => {
        const [countResult, previewResult] = await Promise.all([
          serviceClient
            .from('list_entries')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id),
          serviceClient
            .from('list_entries')
            .select('entries(poster_path, custom_poster_url, title)')
            .eq('list_id', list.id)
            .order('position', { ascending: true })
            .limit(5),
        ])
        const previewEntries = ((previewResult.data || []) as unknown as { entries: { poster_path: string | null; custom_poster_url: string | null; title: string } | null }[])
          .map(le => le.entries)
          .filter(Boolean)
        return { ...list, entry_count: countResult.count || 0, preview_entries: previewEntries }
      })
    )

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
