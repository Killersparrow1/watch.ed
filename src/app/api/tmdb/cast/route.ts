import { NextRequest, NextResponse } from 'next/server'
import { getTMDBFullCast } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tmdbId = searchParams.get('tmdb_id')
    const type = searchParams.get('type') as 'movie' | 'series' | null

    if (!tmdbId || !type || !['movie', 'series'].includes(type)) {
      return NextResponse.json({ error: 'tmdb_id and type (movie|series) are required' }, { status: 400 })
    }

    const cast = await getTMDBFullCast(parseInt(tmdbId), type)
    return NextResponse.json({ cast })
  } catch (error) {
    console.error('GET /api/tmdb/cast error:', error)
    return NextResponse.json({ error: 'Failed to fetch cast' }, { status: 500 })
  }
}
