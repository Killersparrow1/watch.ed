'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Entry } from '@/types/database'
import { Film, Tv, Star, Clock, BarChart3, PieChart, Trash2 } from 'lucide-react'

export default function StatsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (res.ok) {
        router.push('/')
        router.refresh()
      }
    } catch {}
    setDeleting(false)
  }

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/entries?sort=created_at&order=desc')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-tag-bg rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-tag-bg rounded" />
          ))}
        </div>
      </div>
    )
  }

  const movies = entries.filter(e => e.type === 'movie')
  const series = entries.filter(e => e.type === 'series')
  const completed = entries.filter(e => e.status === 'completed')
  const watching = entries.filter(e => e.status === 'watching')
  const rated = entries.filter(e => e.rating !== null)
  const avgRating = rated.length
    ? (rated.reduce((sum, e) => sum + (e.rating || 0), 0) / rated.length).toFixed(1)
    : '—'

  const genreCount: Record<string, number> = {}
  entries.forEach(e => {
    if (e.genres) {
      e.genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1
      })
    }
  })
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const years: Record<number, number> = {}
  entries.forEach(e => {
    if (e.year) {
      years[e.year] = (years[e.year] || 0) + 1
    }
  })
  const yearRange = Object.keys(years).length
    ? `${Math.min(...Object.keys(years).map(Number))}–${Math.max(...Object.keys(years).map(Number))}`
    : '—'

  const totalEpisodes = series.reduce((sum, e) => {
    return sum + (e.progress_episode ? parseInt(e.progress_episode) || 0 : 0)
  }, 0)

  return (
    <div>
      <h1 className="heading-lg mb-8">Stats</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={<Film className="w-5 h-5" />}
          label="Movies"
          value={String(movies.length)}
        />
        <StatCard
          icon={<Tv className="w-5 h-5" />}
          label="Series"
          value={String(series.length)}
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-rating fill-current" />}
          label="Avg Rating"
          value={avgRating}
          sub={rated.length ? `from ${rated.length} ratings` : undefined}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Entries"
          value={String(entries.length)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="heading-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            Status Breakdown
          </h2>
          <div className="space-y-2">
            {[
              { status: 'completed', label: 'Completed', count: completed.length },
              { status: 'watching', label: 'Watching', count: watching.length },
              { status: 'on_hold', label: 'On Hold', count: entries.filter(e => e.status === 'on_hold').length },
              { status: 'dropped', label: 'Dropped', count: entries.filter(e => e.status === 'dropped').length },
              { status: 'plan_to_watch', label: 'Plan to Watch', count: entries.filter(e => e.status === 'plan_to_watch').length },
            ].map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="w-28 text-sm text-text-secondary">{item.label}</span>
                <div className="flex-1 h-2 bg-tag-bg rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-sm transition-all"
                    style={{ width: entries.length ? `${(item.count / entries.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="heading-sm mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-text-muted" />
            Top Genres
          </h2>
          {topGenres.length > 0 ? (
            <div className="space-y-2">
              {topGenres.map(([genre, count]) => (
                <div key={genre} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-text-secondary truncate">{genre}</span>
                  <div className="flex-1 h-2 bg-tag-bg rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-navy rounded-sm transition-all"
                      style={{ width: `${(count / entries.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No genre data available</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
        <MiniStat label="Year range" value={yearRange} />
        <MiniStat label="Rated entries" value={String(rated.length)} />
        <MiniStat label="Total seasons" value={String(series.reduce((s, e) => s + (e.progress_season || 0), 0))} />
        <MiniStat label="Total episodes" value={String(totalEpisodes)} />
      </div>

      <div className="mt-16 pt-8 border-t border-border">
        <h2 className="heading-sm text-accent mb-2">Danger zone</h2>
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete your account and all entries. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-sm text-sm hover:bg-accent-light transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete my account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-accent font-medium">Are you sure?</span>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, delete everything'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-sm p-5">
      <div className="text-text-muted mb-2">{icon}</div>
      <p className="heading-xl mb-1">{value}</p>
      <p className="body-small text-text-secondary">{label}</p>
      {sub && <p className="body-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-sm p-4">
      <p className="heading-md">{value}</p>
      <p className="body-xs text-text-secondary mt-1">{label}</p>
    </div>
  )
}
