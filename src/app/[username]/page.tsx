import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { Film, Tv, Star, Calendar, Timer, Users, List, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Viewport } from 'next'
import PublicFilters from './public-filters'
import FollowButton from '@/components/follow-button'
import ListPosterStrip from '@/components/list-poster-strip'
import BookCard from '@/components/book-card'

export const revalidate = 60

export const viewport: Viewport = {
  userScalable: false,
  maximumScale: 1,
}

interface Props {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  const supabase = await createServiceClient()
  const authSupabase = await createServerSupabaseClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id)

  let isFollowing = false
  if (user) {
    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    isFollowing = !!follow
  }

  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const entryIds = (entries || []).map(e => e.id)

  const { data: watchEvents } = await supabase
    .from('watch_events')
    .select('*')
    .in('entry_id', entryIds.length > 0 ? entryIds : ['none'])
    .order('watch_date', { ascending: false })

  const { data: reactions } = await supabase
    .from('reactions')
    .select('entry_id, reaction')
    .in('entry_id', entryIds.length > 0 ? entryIds : ['none'])

  const { data: publicLists } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const publicListIds = (publicLists || []).map(l => l.id)
  let publicEntryRows: { list_id: string; entries: { poster_path: string | null; custom_poster_url: string | null; title: string } | null }[] = []
  if (publicListIds.length > 0) {
    const { data } = await supabase
      .from('list_entries')
      .select('list_id, position, entries(poster_path, custom_poster_url, title)')
      .in('list_id', publicListIds)
      .order('position', { ascending: true })
    publicEntryRows = (data || []) as unknown as { list_id: string; entries: { poster_path: string | null; custom_poster_url: string | null; title: string } | null }[]
  }

  const listCounts: Record<string, number> = {}
  const listPreviews: Record<string, { poster_path: string | null; custom_poster_url: string | null; title: string }[]> = {}
  for (const row of publicEntryRows) {
    listCounts[row.list_id] = (listCounts[row.list_id] || 0) + 1
    if (row.entries && (listPreviews[row.list_id] || []).length < 4) {
      ;(listPreviews[row.list_id] ||= []).push(row.entries)
    }
  }

  const listsWithCounts = (publicLists || []).map(list => ({
    ...list,
    entry_count: listCounts[list.id] || 0,
    preview_entries: listPreviews[list.id] || [],
  }))

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
  const totalEntries = watched?.length || 0
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
    <div className="min-h-screen bg-bg select-none" style={{ WebkitTouchCallout: 'none' }}>
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link href={`/${username}`} className="flex items-center gap-3">
            <img src="/logo.svg" alt="watch.ed" className="h-14" />
            <span className="text-sm text-text-muted border-l border-border pl-3">
              {profile.display_name}
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
         <div className="mb-10">
           {profile.avatar_url ? (
             <img
               src={profile.avatar_url}
               alt={`${profile.display_name}'s avatar`}
               className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-border"
             />
           ) : (
             <div className="w-20 h-20 rounded-full mb-4 border-2 border-border bg-tag-bg flex items-center justify-center">
               <span className="text-xl font-heading font-bold text-text-muted">
                 {profile.display_name.charAt(0).toUpperCase()}
               </span>
             </div>
           )}
           <h1 className="heading-xl mb-1 flex items-center gap-2">
             {profile.display_name}
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] font-semibold tracking-tight">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Verified
            </span>
          </h1>
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-text-primary transition-colors inline-block mb-4"
              >
                @{profile.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
              </a>
            )}
          {profile.bio && (
            <p className="text-text-secondary mb-4 max-w-lg">{profile.bio}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
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
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {followerCount || 0} {followerCount === 1 ? 'follower' : 'followers'}
            </span>
            {user && user.id !== profile.id && (
              <FollowButton
                followingId={profile.id}
                initialFollowing={isFollowing}
              />
            )}
          </div>
        </div>

        {listsWithCounts.length > 0 && (
          <div className="mb-8">
            <h2 className="heading-sm mb-3 flex items-center gap-2">
              <List className="w-4 h-4 text-text-muted" />
              Library
            </h2>
            <div className="flex flex-wrap gap-3">
              {listsWithCounts.map((list) => (
                <Link
                  key={list.id}
                  href={`/${username}/lists/${list.id}`}
                  className="block w-44 bg-surface border border-border rounded-sm p-3 hover:border-accent/30 transition-colors group"
                >
                  <ListPosterStrip entries={list.preview_entries || []} count={list.entry_count} columns={4} />
                  <p className="text-sm text-text-primary group-hover:text-accent transition-colors mt-2 truncate">{list.name}</p>
                  <p className="body-xs text-text-muted">
                    {list.entry_count} {list.entry_count === 1 ? 'entry' : 'entries'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {entries && entries.length > 0 ? (
          <PublicFilters
            entries={entries}
            watchEvents={watchEvents || []}
            reactionCounts={reactionCounts}
            profileUsername={profile.username}
            profileDisplayName={profile.display_name}
            profileAvatarUrl={profile.avatar_url}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-text-secondary">No entries yet</p>
          </div>
        )}

        {books && books.length > 0 ? (
          <div className="mt-8">
            <h2 className="heading-sm mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-text-muted" />
              Books
            </h2>
            <div className="flex flex-wrap gap-3">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onStatusChange={async () => {}}
                  onDelete={async () => {}}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center py-8">
            <p className="text-text-secondary">No books yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
