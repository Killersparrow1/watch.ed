import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

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
    const targetEntryId = body.target_entry_id
    if (typeof targetEntryId !== 'string' || !targetEntryId) {
      return NextResponse.json({ error: 'target_entry_id is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: source } = await serviceClient
      .from('entries')
      .select('*')
      .eq('id', id)
      .single()

    if (!source || source.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: target } = await serviceClient
      .from('entries')
      .select('*')
      .eq('id', targetEntryId)
      .single()

    if (!target || target.user_id !== user.id) {
      return NextResponse.json({ error: 'Target entry not found' }, { status: 404 })
    }

    if (target.id === source.id) {
      return NextResponse.json({ error: 'Cannot merge an entry into itself' }, { status: 400 })
    }

    // 1. Log the rewatch on the target (entry-level watch data becomes a watch event)
    if (source.watch_date) {
      await serviceClient.from('watch_events').insert({
        entry_id: target.id,
        watch_date: source.watch_date,
        notes: source.notes || null,
        rating: source.rating || null,
        season_number: source.progress_season || null,
        episode_number: source.progress_episode ? parseInt(source.progress_episode) : null,
      })
    }

    // 2. Move the duplicate's existing watch events to the target
    await serviceClient
      .from('watch_events')
      .update({ entry_id: target.id })
      .eq('entry_id', source.id)

    // 3. Move the poster collection (append after the target's posters)
    const { data: sourcePosters } = await serviceClient
      .from('entry_posters')
      .select('id, position')
      .eq('entry_id', source.id)
      .order('position', { ascending: true })

    if (sourcePosters && sourcePosters.length > 0) {
      const { data: targetPosters } = await serviceClient
        .from('entry_posters')
        .select('position')
        .eq('entry_id', target.id)
        .order('position', { ascending: false })
        .limit(1)
      let nextPosition = targetPosters && targetPosters.length > 0 ? (targetPosters[0].position as number) + 1 : 0
      for (const poster of sourcePosters) {
        await serviceClient
          .from('entry_posters')
          .update({ entry_id: target.id, position: nextPosition++ })
          .eq('id', poster.id)
      }
    }

    // 4. Move comments and reactions
    await serviceClient.from('comments').update({ entry_id: target.id }).eq('entry_id', source.id)
    await serviceClient.from('reactions').update({ entry_id: target.id }).eq('entry_id', source.id)

    // 5. Move list membership (skip lists the target is already in)
    const { data: sourceListEntries } = await serviceClient
      .from('list_entries')
      .select('id, list_id')
      .eq('entry_id', source.id)

    if (sourceListEntries && sourceListEntries.length > 0) {
      const { data: targetListEntries } = await serviceClient
        .from('list_entries')
        .select('list_id')
        .eq('entry_id', target.id)

      const alreadyInLists = new Set((targetListEntries || []).map((le) => le.list_id))
      for (const le of sourceListEntries) {
        if (alreadyInLists.has(le.list_id)) {
          await serviceClient.from('list_entries').delete().eq('id', le.id)
        } else {
          await serviceClient.from('list_entries').update({ entry_id: target.id }).eq('id', le.id)
        }
      }
    }

    // 6. Fill in missing metadata on the target from the duplicate
    const enrich: Record<string, unknown> = {}
    if (!target.poster_path && source.poster_path) enrich.poster_path = source.poster_path
    if (!target.custom_poster_url && source.custom_poster_url) enrich.custom_poster_url = source.custom_poster_url
    if (!target.imdb_id && source.imdb_id) enrich.imdb_id = source.imdb_id
    if (!target.year && source.year) enrich.year = source.year
    if ((!target.genres || target.genres.length === 0) && source.genres?.length) enrich.genres = source.genres
    if (!target.overview && source.overview) enrich.overview = source.overview
    if (!target.runtime && source.runtime) enrich.runtime = source.runtime
    if (!target.tagline && source.tagline) enrich.tagline = source.tagline
    if (!target.cast_crew && source.cast_crew) enrich.cast_crew = source.cast_crew
    if ((!target.watch_providers || target.watch_providers.length === 0) && source.watch_providers?.length) {
      enrich.watch_providers = source.watch_providers
    }
    if (!target.favorite && source.favorite) enrich.favorite = true
    if (!target.badge && source.badge) enrich.badge = source.badge
    if (Object.keys(enrich).length > 0) {
      await serviceClient.from('entries').update(enrich).eq('id', target.id)
    }

    // 7. Keep the duplicate's old URL working -> redirect to the target
    await serviceClient.from('entry_redirects').insert({
      entry_id: source.id,
      target_entry_id: target.id,
    })

    // 8. Delete the duplicate
    const { error } = await serviceClient.from('entries').delete().eq('id', source.id)
    if (error) throw error

    return NextResponse.json({ success: true, target_entry_id: target.id })
  } catch (error) {
    console.error('POST /api/entries/[id]/merge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}