import { createServiceClient } from '@/lib/supabase/server'
import { Globe, Lock, ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEntryPosterUrl } from '@/lib/tmdb'
import type { Entry, List } from '@/types/database'

interface Props {
  params: Promise<{ username: string; id: string }>
}

export default async function PublicListPage({ params }: Props) {
  const { username, id } = await params

  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: list } = await supabase
    .from('lists')
    .select('*')
    .eq('id', id)
    .eq('user_id', profile.id)
    .single()

  if (!list || !list.is_public) notFound()

  const { data: entries } = await supabase
    .from('list_entries')
    .select('entries(*)')
    .eq('list_id', id)
    .order('position', { ascending: true })

  const entryList = ((entries || []) as { entries: unknown }[]).map(le => le.entries as Entry).filter(Boolean)

  const { data: reactions } = await supabase
    .from('reactions')
    .select('entry_id, reaction')
    .in('entry_id', entryList.length > 0 ? entryList.map(e => e.id) : ['none'])

  const reactionCounts: Record<string, { likes: number; dislikes: number }> = {}
  for (const entry of entryList) {
    reactionCounts[entry.id] = { likes: 0, dislikes: 0 }
  }
  for (const r of reactions || []) {
    if (reactionCounts[r.entry_id]) {
      if (r.reaction === 'like') reactionCounts[r.entry_id].likes++
      else reactionCounts[r.entry_id].dislikes++
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/${username}`} className="flex items-center gap-3">
            <img src="/logo.svg" alt="watch.ed" className="h-14" />
            <span className="text-sm text-text-muted border-l border-border pl-3">
              {profile.display_name}
            </span>
          </Link>
          <Link
            href={`/${username}`}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Profile
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="heading-xl">{list.name}</h1>
            {list.is_public
              ? <Globe className="w-4 h-4 text-text-muted" />
              : <Lock className="w-4 h-4 text-text-muted" />
            }
          </div>
          {list.description && (
            <p className="text-text-secondary mb-2 max-w-lg">{list.description}</p>
          )}
          <p className="text-sm text-text-muted">
            {entryList.length} {entryList.length === 1 ? 'entry' : 'entries'} &middot; by {profile.display_name}
          </p>
        </div>

        {entryList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {entryList.map((entry) => {
              const posterUrl = getEntryPosterUrl(entry, 'w185')
              const notesExcerpt = entry.notes
                ?.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[#>*`~|_]/g, '')
                .replace(/\n+/g, ' ')
                .trim()
                .slice(0, 160)
              const hasReview = !!entry.rating || !!notesExcerpt
              return (
                <div key={entry.id} className="bg-surface border border-border rounded-sm overflow-hidden group">
                  <Link
                    href={`/${username}/${entry.id}`}
                    className={`block ${hasReview ? '' : 'cursor-default'}`}
                    onClick={hasReview ? undefined : (e) => e.preventDefault()}
                  >
                    <div className="aspect-[2/3] bg-tag-bg relative">
                      {posterUrl ? (
                        <img src={posterUrl} alt={entry.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
                          {entry.title}
                        </div>
                      )}
                      {entry.rating && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-surface/90 border border-border rounded-sm text-xs font-medium text-text-primary flex items-center gap-1">
                          <Star className="w-3 h-3 text-rating fill-current" />
                          {entry.rating}/10
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-text-primary truncate font-medium group-hover:text-accent transition-colors">{entry.title}</p>
                      <p className="body-xs text-text-muted">{entry.year || ''}</p>
                      {notesExcerpt && (
                        <p className="text-[11px] text-text-secondary leading-snug mt-1 line-clamp-2">{notesExcerpt}</p>
                      )}
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-text-secondary">This list is empty</p>
          </div>
        )}
      </main>
    </div>
  )
}
