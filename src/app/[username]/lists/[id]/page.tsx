import { createServiceClient } from '@/lib/supabase/server'
import { Globe, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Entry, List, WatchEvent } from '@/types/database'
import ListEntryTile from './list-entry-tile'

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
  const entryIds = entryList.map(e => e.id)

  const { data: watchEvents } = await supabase
    .from('watch_events')
    .select('*')
    .in('entry_id', entryIds.length > 0 ? entryIds : ['none'])
    .order('watch_date', { ascending: false })

  const watchEventsByEntry: Record<string, WatchEvent[]> = {}
  for (const event of (watchEvents || []) as WatchEvent[]) {
    if (!watchEventsByEntry[event.entry_id]) watchEventsByEntry[event.entry_id] = []
    watchEventsByEntry[event.entry_id].push(event)
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
            {entryList.map((entry) => (
              <ListEntryTile
                key={entry.id}
                entry={entry}
                watchEvents={watchEventsByEntry[entry.id] || []}
              />
            ))}
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
