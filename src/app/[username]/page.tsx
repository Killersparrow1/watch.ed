import { createServiceClient } from '@/lib/supabase/server'
import { Film, Tv, Star, Calendar, Timer } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicFilters from './public-filters'

interface Props {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const entryIds = (entries || []).map(e => e.id)

  const { data: reactions } = await supabase
    .from('reactions')
    .select('entry_id, reaction')
    .in('entry_id', entryIds.length > 0 ? entryIds : ['none'])

  const reactionCounts: Record<string, { likes: number; dislikes: number }> = {}
  for (const entry of entries || []) {
    reactionCounts[entry.id] = { likes: 0, dislikes: 0 }
  }
  for (const r of reactions || []) {
    if (reactionCounts[r.entry_id]) {
      if (r.reaction === 'like') reactionCounts[r.entry_id].likes++
      else reactionCounts[r.entry_id].dislikes++
    }
  }

  const watched = (entries || []).filter(e => e.status !== 'plan_to_watch')
  const movies = watched?.filter(e => e.type === 'movie').length || 0
  const totalSeries = watched?.filter(e => e.type === 'series').length || 0
  const totalEntries = entries?.length || 0
  const ratedEntries = watched?.filter(e => e.rating !== null).length || 0
  const avgRating = ratedEntries
    ? (watched!.filter(e => e.rating).reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries).toFixed(1)
    : null

  const totalMovieMinutes = (watched || [])
    .filter(e => e.type === 'movie')
    .reduce((sum, e) => sum + (e.runtime || 0), 0)

  const totalSeriesMinutes = (watched || [])
    .filter(e => e.type === 'series' && e.runtime && e.progress_episode && e.progress_episode.trim() !== '')
    .reduce((sum, e) => {
      const eps = String(e.progress_episode).split(/[,;]/).reduce((acc, part) => {
        const range = part.trim().split('-')
        if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
        if (parseInt(part.trim())) return acc + 1
        return acc
      }, 0)
      return sum + (e.runtime || 0) * Math.max(eps, 0)
    }, 0)

  const totalMinutes = totalMovieMinutes + totalSeriesMinutes
  const totalHours = totalMinutes ? Math.round(totalMinutes / 60) : null

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href={`/${username}`} className="flex items-center gap-3">
            <img src="/logo.svg" alt="watch.ed" className="h-10" />
            <span className="text-sm text-text-muted border-l border-border pl-3">
              {profile.display_name}
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
         <div className="mb-10">
           <img
             src="https://i.postimg.cc/L6YxyFxr/image.png"
             alt={`${profile.display_name}'s avatar`}
             className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-border"
           />
           <h1 className="heading-xl mb-1 flex items-center gap-2">
             {profile.display_name}
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] font-semibold tracking-tight">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Verified
            </span>
          </h1>
          <a
            href="https://www.instagram.com/meeeeeeeeeeeelas/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-text-primary transition-colors inline-block mb-4"
          >
            @meeeeeeeeeeeelas
          </a>
          {profile.bio && (
            <p className="text-text-secondary mb-4 max-w-lg">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {movies} movies
            </span>
            <span className="flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" />
              {totalSeries} series
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-rating" />
              {avgRating ? `${avgRating} avg` : 'No ratings yet'}
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              {totalHours ? `${totalHours}h` : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {totalEntries} total
            </span>
          </div>
        </div>

        {entries && entries.length > 0 ? (
          <PublicFilters
            entries={entries}
            reactionCounts={reactionCounts}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-text-secondary">No entries yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
