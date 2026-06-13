import { createServiceClient } from '@/lib/supabase/server'
import { Film, Star, Calendar } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicEntryCard from './public-entry-card'

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

  const movies = entries?.filter(e => e.type === 'movie').length || 0
  const totalSeries = entries?.filter(e => e.type === 'series').length || 0
  const totalEntries = entries?.length || 0
  const ratedEntries = entries?.filter(e => e.rating !== null).length || 0
  const avgRating = ratedEntries
    ? (entries!.filter(e => e.rating).reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href={`/${username}`} className="flex items-center gap-2">
            <Film className="w-5 h-5 text-accent" />
            <span className="heading text-lg tracking-tight">
              {profile.display_name}&apos;s watch.ed
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="heading-xl mb-2">{profile.display_name}</h1>
          {profile.bio && (
            <p className="text-text-secondary mb-4 max-w-lg">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {movies} movies
            </span>
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {totalSeries} series
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-rating" />
              {avgRating ? `${avgRating} avg` : 'No ratings yet'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {totalEntries} total entries
            </span>
          </div>
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="text-center py-20">
            <p className="text-text-secondary">No entries yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => {
              const counts = reactionCounts[entry.id] || { likes: 0, dislikes: 0 }
              return (
                <PublicEntryCard
                  key={entry.id}
                  entry={entry}
                  likes={counts.likes}
                  dislikes={counts.dislikes}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
