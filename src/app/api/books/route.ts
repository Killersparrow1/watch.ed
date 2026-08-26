import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)

    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('title', `%${search}%`)

    if (limit) query = query.limit(parseInt(limit))

    const { data: books, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ books: books || [] })
  } catch (error) {
    console.error('GET /api/books error:', error)
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
    const { title, status, rating, progress, notes, cover_url, open_library_id, isbn, published_date, page_count } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const validStatuses = ['want_to_read', 'currently_reading', 'read', 'did_not_finish']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (rating !== null && rating !== undefined) {
      const r = Number(rating)
      if (!Number.isInteger(r) || r < 1 || r > 10) {
        return NextResponse.json({ error: 'Rating must be an integer between 1 and 10' }, { status: 400 })
      }
    }

    if (progress !== null && progress !== undefined) {
      const p = Number(progress)
      if (!Number.isInteger(p) || p < 0) {
        return NextResponse.json({ error: 'Progress must be a non-negative integer' }, { status: 400 })
      }
    }

    const record = {
      user_id: user.id,
      title: title.trim(),
      status: status || 'want_to_read',
      rating: rating || null,
      progress: progress || 0,
      notes: notes || null,
      cover_url: cover_url || null,
      open_library_id: open_library_id || null,
      isbn: isbn || null,
      published_date: published_date || null,
      page_count: page_count || null,
    }

    const { data, error } = await supabase
      .from('books')
      .insert(record)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ book: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/books error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    const { status } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 })
    }

    const validStatuses = ['want_to_read', 'currently_reading', 'read', 'did_not_finish']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('books')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json({ book: data }, { status: 200 })
  } catch (error) {
    console.error('PUT /api/books error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}