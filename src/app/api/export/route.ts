import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data: entries, error } = await serviceClient
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (format === 'csv') {
      const headers = [
        'title', 'type', 'status', 'rating', 'year', 'tmdb_id', 'imdb_id',
        'poster_path', 'genres', 'overview', 'tagline', 'cast_crew', 'runtime',
        'watch_date', 'progress_season', 'progress_episode', 'notes', 'badge',
        'favorite', 'custom_poster_url', 'watch_providers', 'download_url',
        'created_at', 'updated_at',
      ]

      const rows = (entries || []).map(e =>
        headers.map(h => {
          const val = e[h as keyof typeof e]
          if (val === null || val === undefined) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        }).join(',')
      )

      const csv = [headers.join(','), ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="watch-ed-entries.csv"',
        },
      })
    }

    return NextResponse.json(entries || [])
  } catch (error) {
    console.error('GET /api/export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
