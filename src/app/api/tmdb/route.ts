import { NextRequest, NextResponse } from 'next/server'
import { searchTMDB, getTMDBDetails } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const tmdbId = searchParams.get('tmdb_id')
    const type = searchParams.get('type') as 'movie' | 'series' | null

    if (query) {
      const results = await searchTMDB(query)
      return NextResponse.json({ results })
    }

    if (tmdbId && type) {
      const details = await getTMDBDetails(parseInt(tmdbId), type)
      return NextResponse.json({ result: details })
    }

    return NextResponse.json({ error: 'Provide either query or tmdb_id+type' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/tmdb error:', error)
    return NextResponse.json({ error: 'Failed to search TMDB' }, { status: 500 })
  }
}
