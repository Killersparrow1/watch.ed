import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { data: goal } = await serviceClient
      .from('watch_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle()

    const { data: entries } = await serviceClient
      .from('entries')
      .select('type, rating, runtime, progress_episode, watch_date')
      .eq('user_id', user.id)
      .neq('status', 'plan_to_watch')

    const yearEntries = (entries || []).filter(e => {
      if (!e.watch_date) return false
      const d = new Date(e.watch_date)
      return !isNaN(d.getTime()) && d.getFullYear() === year
    })

    const movies = yearEntries.filter(e => e.type === 'movie').length
    const series = yearEntries.filter(e => e.type === 'series').length

    const seriesMinutes = yearEntries
      .filter(e => e.type === 'series' && e.runtime && e.progress_episode)
      .reduce((sum, e) => {
        const eps = String(e.progress_episode || '').split(/[,;]/).reduce((acc: number, part: string) => {
          const range = part.trim().split('-')
          if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
          if (parseInt(part.trim())) return acc + 1
          return acc
        }, 0)
        return sum + (e.runtime || 0) * Math.max(eps, 0)
      }, 0)

    const movieMinutes = yearEntries
      .filter(e => e.type === 'movie')
      .reduce((sum, e) => sum + (e.runtime || 0), 0)

    const totalMinutes = movieMinutes + seriesMinutes
    const episodeCount = yearEntries
      .filter(e => e.type === 'series' && e.progress_episode)
      .reduce((sum, e) => {
        return sum + String(e.progress_episode || '').split(/[,;]/).reduce((acc: number, part: string) => {
          const range = part.trim().split('-')
          if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
          if (parseInt(part.trim())) return acc + 1
          return acc
        }, 0)
      }, 0)

    return NextResponse.json({
      goal: goal || { movie_target: 0, series_target: 0, episode_target: 0, hour_target: 0 },
      progress: {
        movies,
        series,
        episodes: episodeCount,
        hours: Math.round(totalMinutes / 60),
      },
    })
  } catch (error) {
    console.error('GET /api/goals error:', error)
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

    const body = await request.json()
    const { year, movie_target, series_target, episode_target, hour_target } = body

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data, error } = await serviceClient
      .from('watch_goals')
      .upsert({
        user_id: user.id,
        year,
        movie_target: movie_target || 0,
        series_target: series_target || 0,
        episode_target: episode_target || 0,
        hour_target: hour_target || 0,
      }, { onConflict: 'user_id, year' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ goal: data })
  } catch (error) {
    console.error('PUT /api/goals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
