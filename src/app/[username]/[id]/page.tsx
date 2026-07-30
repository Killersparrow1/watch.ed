import { createServiceClient } from '@/lib/supabase/server'
import { ArrowLeft, Calendar, Film, Tv, Timer } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEntryPosterUrl } from '@/lib/tmdb'
import type { Metadata } from 'next'
import ReviewContent from './review-content'

interface Props {
  params: Promise<{ username: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, id } = await params
  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('username', username)
    .single()

  if (!profile) return {}

  const { data: entry } = await supabase
    .from('entries')
    .select('title, year, notes, poster_path, tagline, custom_poster_url, overview')
    .eq('id', id)
    .eq('user_id', profile.id)
    .single()

  if (!entry) return {}

  const poster = entry.custom_poster_url || (entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : null)
  const excerpt = entry.notes?.slice(0, 200).replace(/\s+\S*$/, '') || entry.tagline || entry.overview?.slice(0, 200) || `Review of ${entry.title}`

  return {
    title: `@${username}'s review of ${entry.title} — watch.ed`,
    description: excerpt,
    openGraph: {
      title: `${entry.title} — reviewed by @${username}`,
      description: excerpt,
      ...(poster ? { images: [{ url: poster, width: 500, height: 750 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entry.title} — reviewed by @${username}`,
      description: excerpt,
      ...(poster ? { images: [poster] } : {}),
    },
  }
}

export default async function ReviewPage({ params }: Props) {
  const { username, id } = await params

  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: entry } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', profile.id)
    .single()

  if (!entry) notFound()

  const [watchEventsResult, reactionsResult] = await Promise.all([
    supabase
      .from('watch_events')
      .select('*')
      .eq('entry_id', id)
      .order('watch_date', { ascending: false }),
    supabase
      .from('reactions')
      .select('reaction')
      .eq('entry_id', id),
  ])

  const watchEvents = watchEventsResult.data || []
  const reactions = reactionsResult.data || []
  const likes = reactions.filter(r => r.reaction === 'like').length
  const dislikes = reactions.filter(r => r.reaction === 'dislike').length

  const poster = getEntryPosterUrl(entry, 'w342')

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/${username}`} className="flex items-center gap-3 hover:bg-tag-bg/50 rounded-sm px-2 -mx-2 transition-all">
            <img src="/logo.svg" alt="watch.ed" className="h-14" />
            <span className="text-sm text-text-muted border-l border-border pl-3">
              {profile.display_name}
            </span>
          </Link>
          <Link
            href={`/${username}`}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-tag-bg/50 rounded-sm px-3 -mx-3 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Profile
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            {poster ? (
              <img
                src={poster}
                alt={entry.title}
                className="w-full aspect-[2/3] object-cover rounded-sm"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-tag-bg rounded-sm flex items-center justify-center">
                {entry.type === 'movie' ? (
                  <Film className="w-12 h-12 text-text-muted/40" />
                ) : (
                  <Tv className="w-12 h-12 text-text-muted/40" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="heading-xl mb-1">{entry.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted mb-4">
              {entry.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {entry.year}
                </span>
              )}
              <span className="flex items-center gap-1">
                {entry.type === 'movie' ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                {entry.type === 'movie' ? 'Movie' : 'Series'}
              </span>
              {entry.runtime && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  {entry.runtime >= 60
                    ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m`
                    : `${entry.runtime}m`}
                </span>
              )}
            </div>

            {entry.tagline && (
              <p className="text-sm italic text-text-secondary mb-4">&ldquo;{entry.tagline}&rdquo;</p>
            )}

            <ReviewContent
              entry={entry}
              watchEvents={watchEvents}
              likes={likes}
              dislikes={dislikes}
              username={username}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
