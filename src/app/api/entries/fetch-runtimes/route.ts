import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { getTMDBDetails } from '@/lib/tmdb'

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
      .select('id, tmdb_id, type, title, year')
      .eq('user_id', user.id)
      .not('tmdb_id', 'is', null)

    if (!entries || entries.length === 0) {
      return NextResponse.json({ updated: 0, message: 'No entries with tmdb_id' })
    }

    let updated = 0
    let failed = 0

    for (const entry of entries) {
      try {
        const details = await getTMDBDetails(entry.tmdb_id, entry.type as 'movie' | 'series')
        if (details?.runtime) {
          await serviceClient
            .from('entries')
            .update({ runtime: details.runtime })
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
    })
  } catch (error) {
    console.error('POST /api/entries/fetch-runtimes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
