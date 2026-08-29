import { getEntryPosterUrl } from '@/lib/tmdb'
import { Entry } from '@/types/database'
import { Film, Tv, Star, Heart, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { renderNotes } from '@/lib/render-notes'

const statusColors: Record<string, string> = {
  watching: 'text-status-watching bg-status-watching/10',
  completed: 'text-status-completed bg-status-completed/10',
  on_hold: 'text-status-on-hold bg-status-on-hold/10',
  dropped: 'text-status-dropped bg-status-dropped/10',
  plan_to_watch: 'text-status-plan bg-status-plan/10',
}

const statusLabels: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On Hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to Watch',
}

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface Props {
  entry: Entry & { profile?: Profile | null }
}

export default function FeedCard({ entry }: Props) {
  const poster = getEntryPosterUrl(entry, 'w185')
  const profile = entry.profile

  return (
    <div className="flex items-start gap-3 bg-surface border border-border rounded-sm p-3 transition-colors">
      <div className="w-10 h-14 flex-shrink-0 bg-tag-bg rounded-sm overflow-hidden relative">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.type === 'movie' ? (
              <Film className="w-4 h-4 text-text-muted/40" />
            ) : (
              <Tv className="w-4 h-4 text-text-muted/40" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {profile && (
              <Link
                href={`/${profile.username}`}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors mb-1"
              >
                <User className="w-3 h-3" />
                <span className="font-medium">{profile.display_name || profile.username}</span>
              </Link>
            )}
            <p className="text-sm font-medium leading-tight truncate">
              <Link href={`/dashboard/edit/${entry.id}`} className="hover:text-accent transition-colors">
                {entry.title}
              </Link>
              {entry.year && <span className="text-text-muted font-normal"> ({entry.year})</span>}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{entry.type === 'movie' ? 'Film' : 'Series'}</span>
              {entry.runtime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>
                    {entry.runtime >= 60
                      ? `${Math.floor(entry.runtime / 60)}h ${entry.runtime % 60}m`
                      : `${entry.runtime}m`}
                  </span>
                </>
              )}
              <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${statusColors[entry.status]}`}>
                {statusLabels[entry.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.rating && (
              <div className="flex items-center gap-0.5 text-xs font-medium text-rating">
                <Star className="w-3 h-3 fill-current" />
                {entry.rating}
              </div>
            )}
            {entry.favorite && (
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            )}
          </div>
        </div>

        {entry.notes && (
          <div className="text-xs text-text-muted mt-1 line-clamp-1 leading-relaxed">
            {renderNotes(entry.notes)}
          </div>
        )}
      </div>
    </div>
  )
}
