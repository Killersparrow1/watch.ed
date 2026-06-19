import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { searchBestMatch, searchBestMatchMulti, getTMDBDetails, findByIMDbId, getExternalIds } from '@/lib/tmdb'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { data: entries } = await serviceClient
      .from('entries')
      .select('id, title, type, year, tmdb_id, poster_path')
      .eq('user_id', user.id)
      .is('poster_path', null)

    if (!entries || entries.length === 0) {
      return NextResponse.json({ updated: 0, message: 'No entries missing posters' })
    }

    let updated = 0
    let failed = 0

    for (const entry of entries) {
      try {
        let result = null

        if (entry.tmdb_id) {
          result = await getTMDBDetails(entry.tmdb_id, entry.type as 'movie' | 'series')
        } else {
          result = await searchBestMatch(entry.title, entry.year, entry.type as 'movie' | 'series')
          if (!result) {
            result = await searchBestMatchMulti(entry.title, entry.year)
          }
        }

        if (result && result.poster_path) {
          const updates: Record<string, unknown> = {
            poster_path: result.poster_path,
            tmdb_id: result.tmdb_id,
            year: result.year || entry.year,
            overview: result.overview || null,
            runtime: result.runtime || null,
            tagline: result.tagline || null,
            cast_crew: result.cast_crew || null,
          }
          if (result.tmdb_id) {
            const extIds = await getExternalIds(result.tmdb_id, result.media_type)
            if (extIds.imdb_id) updates.imdb_id = extIds.imdb_id
          }
          await serviceClient
            .from('entries')
            .update(updates)
            .eq('id', entry.id)

          updated++
        } else {
          failed++
        }

        await new Promise(r => setTimeout(r, 250))
      } catch {
        failed++
      }
    }

    return NextResponse.json({
      updated,
      failed,
      total: entries.length,
      message: `Found posters for ${updated} of ${entries.length} entries`,
    })
  } catch (error) {
    console.error('POST /api/entries/fetch-posters error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
