'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Entry } from '@/types/database'
import { Film, Tv, Star, Clock, BarChart3, PieChart, Trash2, Timer, RefreshCw, TrendingUp, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function StatsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingEntries, setDeletingEntries] = useState(false)
  const [confirmDeleteEntries, setConfirmDeleteEntries] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [fetchingRuntime, setFetchingRuntime] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const [wrapYear, setWrapYear] = useState(currentYear)
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

  async function handleDeleteAllEntries() {
    setDeletingEntries(true)
    try {
      const res = await fetch('/api/entries', { method: 'DELETE' })
      if (res.ok) {
        setEntries([])
        setDeleteConfirmText('')
        setConfirmDeleteEntries(false)
      }
    } catch {}
    setDeletingEntries(false)
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

  useEffect(() => {
    setAiText(null)
    setAiError(null)
  }, [wrapYear])

  async function handleAiWrap() {
    setAiLoading(true)
    setAiError(null)
    setAiText(null)
    try {
      const res = await fetch('/api/ai/wrapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: wrapYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setAiText(data.text)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setAiLoading(false)
    }
  }

  const years = useMemo(() => {
    const y = new Set<number>()
    entries.forEach(e => {
      if (e.watch_date) {
        const d = new Date(e.watch_date)
        if (!isNaN(d.getTime())) y.add(d.getFullYear())
      }
    })
    return Array.from(y).sort((a, b) => b - a)
  }, [entries])

  const wrapEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.watch_date) return false
      const d = new Date(e.watch_date)
      return !isNaN(d.getTime()) && d.getFullYear() === wrapYear
    })
  }, [entries, wrapYear])

  const prevWrapEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.watch_date) return false
      const d = new Date(e.watch_date)
      return !isNaN(d.getTime()) && d.getFullYear() === wrapYear - 1
    })
  }, [entries, wrapYear])

  const wrapStats = useMemo(() => {
    const movies = wrapEntries.filter(e => e.type === 'movie')
    const series = wrapEntries.filter(e => e.type === 'series')
    const rated = wrapEntries.filter(e => e.rating !== null)
    const avgRating = rated.length
      ? (rated.reduce((s, e) => s + (e.rating || 0), 0) / rated.length).toFixed(1)
      : null

    const genreCount: Record<string, number> = {}
    wrapEntries.forEach(e => {
      if (e.genres) e.genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1
      })
    })
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]

    const monthlyActivity: number[] = Array(12).fill(0)
    wrapEntries.forEach(e => {
      if (e.watch_date) {
        const d = new Date(e.watch_date)
        if (!isNaN(d.getTime())) monthlyActivity[d.getMonth()]++
      }
    })

    const ratingDist: Record<number, number> = {}
    rated.forEach(e => { const r = e.rating || 0; ratingDist[r] = (ratingDist[r] || 0) + 1 })

    const bestRated = rated.length
      ? rated.reduce((best, e) => ((e.rating || 0) > (best.rating || 0) ? e : best))
      : null

    const movieMinutes = movies.reduce((s, e) => s + (e.runtime || 0), 0)
    const seriesMinutes = series
      .filter(e => e.runtime && e.progress_episode)
      .reduce((s, e) => {
        const eps = (e.progress_episode || '').split(/[,;]/).reduce((acc, part) => {
          const range = part.trim().split('-')
          if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
          if (parseInt(part.trim())) return acc + 1
          return acc
        }, 0)
        return s + (e.runtime || 0) * Math.max(eps, 0)
      }, 0)
    const totalHours = Math.round((movieMinutes + seriesMinutes) / 60)

    const prevRated = prevWrapEntries.filter(e => e.rating !== null)
    const prevAvg = prevRated.length
      ? (prevRated.reduce((s, e) => s + (e.rating || 0), 0) / prevRated.length).toFixed(1)
      : null

    return {
      movies: movies.length,
      series: series.length,
      avgRating,
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      monthlyActivity,
      ratingDist,
      bestRated,
      totalHours,
      totalEntries: wrapEntries.length,
      prevAvg,
      prevEntries: prevWrapEntries.length,
    }
  }, [wrapEntries, prevWrapEntries])

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

  const genreNames: Record<string, string> = {
    '28': 'Action', '12': 'Adventure', '16': 'Animation', '35': 'Comedy',
    '80': 'Crime', '99': 'Documentary', '18': 'Drama', '10751': 'Family',
    '14': 'Fantasy', '36': 'History', '27': 'Horror', '10402': 'Music',
    '9648': 'Mystery', '10749': 'Romance', '878': 'Sci-Fi', '10770': 'TV Movie',
    '53': 'Thriller', '10752': 'War', '37': 'Western',
    '10759': 'Action & Adventure', '10762': 'Kids', '10763': 'News',
    '10764': 'Reality', '10765': 'Sci-Fi & Fantasy', '10766': 'Soap',
    '10767': 'Talk', '10768': 'War & Politics',
  }
  const genreCount: Record<string, number> = {}
  entries.forEach(e => {
    if (e.genres) {
      e.genres.forEach(g => {
        const name = genreNames[g] || g
        genreCount[name] = (genreCount[name] || 0) + 1
      })
    }
  })
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const yearsMap: Record<number, number> = {}
  entries.forEach(e => { if (e.year) yearsMap[e.year] = (yearsMap[e.year] || 0) + 1 })
  const yearRange = Object.keys(yearsMap).length
    ? `${Math.min(...Object.keys(yearsMap).map(Number))}–${Math.max(...Object.keys(yearsMap).map(Number))}`
    : '—'

  function countEpisodes(progress: string | null): number {
    if (!progress) return 0
    return progress.split(/[,;]/).reduce((acc, part) => {
      const range = part.trim().split('-')
      if (range.length === 2) return acc + (parseInt(range[1]) - parseInt(range[0]) + 1)
      if (parseInt(part.trim())) return acc + 1
      return acc
    }, 0)
  }

  const totalEpisodes = series.reduce((sum, e) => sum + countEpisodes(e.progress_episode), 0)
  const watchedMovies = movies.filter(e => e.status !== 'plan_to_watch')
  const watchedSeries = series.filter(e => e.status !== 'plan_to_watch')
  const totalMovieMinutes = watchedMovies.reduce((sum, e) => sum + (e.runtime || 0), 0)
  const seriesWithRuntime = watchedSeries.filter(e => e.runtime && e.progress_episode && e.progress_episode.trim() !== '')
  const totalSeriesMinutes = seriesWithRuntime.reduce((sum, e) => {
    const eps = countEpisodes(e.progress_episode)
    return sum + (e.runtime || 0) * eps
  }, 0)
  const totalMinutes = totalMovieMinutes + totalSeriesMinutes
  const totalHours = totalMinutes > 0 ? Math.round(totalMinutes / 60) : null

  const maxMonthly = Math.max(...wrapStats.monthlyActivity, 1)
  const maxRating = Math.max(...Object.values(wrapStats.ratingDist), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg">Stats</h1>
        <button
          onClick={async () => {
            setFetchingRuntime(true)
            try { await fetch('/api/entries/fetch-runtimes', { method: 'POST' }); window.location.reload() }
            catch {}
          }}
          disabled={fetchingRuntime}
          className="p-2 bg-crimson text-white rounded-sm hover:bg-crimson/80 transition-colors disabled:opacity-50"
          title="Refresh metadata from TMDB (posters, runtime, tagline, cast)"
        >
          <RefreshCw className={`w-5 h-5 ${fetchingRuntime ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Film className="w-5 h-5" />} label="Movies" value={String(movies.length)} />
        <StatCard icon={<Tv className="w-5 h-5" />} label="Series" value={String(series.length)} />
        <StatCard icon={<Star className="w-5 h-5 text-rating fill-current" />} label="Avg Rating" value={avgRating} sub={rated.length ? `from ${rated.length} ratings` : undefined} />
        <StatCard icon={<Timer className="w-5 h-5" />} label="Total Watch Time" value={totalHours ? `${totalHours}h` : '—'} sub={totalMinutes ? `~${totalMinutes} min` : undefined} />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Total Entries" value={String(entries.length)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
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
                  <div className="h-full bg-accent rounded-sm transition-all" style={{ width: entries.length ? `${(item.count / entries.length) * 100}%` : '0%' }} />
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
                    <div className="h-full bg-navy rounded-sm transition-all" style={{ width: `${(count / entries.length) * 100}%` }} />
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        <MiniStat label="Year range" value={yearRange} />
        <MiniStat label="Rated entries" value={String(rated.length)} />
        <MiniStat label="Movie hours" value={totalMovieMinutes ? `${Math.round(totalMovieMinutes / 60)}h` : '—'} />
        <MiniStat label="Series hours" value={totalSeriesMinutes ? `${Math.round(totalSeriesMinutes / 60)}h` : '—'} />
      </div>

      <hr className="border-border mb-10" />

      <div className="flex items-center justify-between mb-8">
        <h2 className="heading-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Year in Review
        </h2>
        <div className="flex items-center gap-2">
          {years.length > 0 && (
            <div className="flex items-center gap-1 bg-surface border border-border rounded-sm">
              <button
                onClick={() => setWrapYear(years[Math.min(years.indexOf(wrapYear) + 1, years.length - 1)])}
                disabled={wrapYear >= Math.max(...years)}
                className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-text-primary px-2 min-w-[4rem] text-center">{wrapYear}</span>
              <button
                onClick={() => setWrapYear(years[Math.max(years.indexOf(wrapYear) - 1, 0)])}
                disabled={wrapYear <= Math.min(...years)}
                className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {wrapYear < currentYear && (
            <button onClick={() => setWrapYear(currentYear)} className="text-xs text-accent hover:text-accent-hover px-2 py-1">
              Back to {currentYear}
            </button>
          )}
          <button
            onClick={handleAiWrap}
            disabled={aiLoading || wrapStats.totalEntries === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-sm text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {aiLoading ? 'Writing...' : 'Write with AI'}
          </button>
        </div>
      </div>

      {aiError && <p className="text-xs text-accent mb-4">{aiError}</p>}

      {aiText && (
        <div className="bg-surface border border-accent/20 rounded-sm p-6 mb-6">
          <h3 className="heading-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Your {wrapYear} story
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{aiText}</p>
        </div>
      )}

      {wrapStats.totalEntries === 0 ? (
        <div className="text-center py-12 border border-border rounded-sm">
          <Sparkles className="w-10 h-10 text-text-muted/30 mx-auto mb-2" />
          <p className="text-text-secondary text-sm">No entries for {wrapYear}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={<Film className="w-5 h-5" />} label="Movies" value={String(wrapStats.movies)} />
            <StatCard icon={<Tv className="w-5 h-5" />} label="Series" value={String(wrapStats.series)} />
            <StatCard icon={<Timer className="w-5 h-5" />} label="Hours" value={String(wrapStats.totalHours)} />
            <StatCard icon={<Star className="w-5 h-5 text-rating fill-current" />} label="Avg Rating" value={wrapStats.avgRating || '—'} />
            <StatCard icon={<Film className="w-5 h-5" />} label="Total" value={String(wrapStats.totalEntries)} />
          </div>

          {wrapStats.prevEntries > 0 && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h3 className="heading-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-text-muted" />
                vs {wrapYear - 1}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <CompareStat label="Entries" current={wrapStats.totalEntries} previous={wrapStats.prevEntries} />
                <CompareStat label="Avg Rating" current={wrapStats.avgRating ? parseFloat(wrapStats.avgRating) : 0} previous={wrapStats.prevAvg ? parseFloat(wrapStats.prevAvg) : 0} isRating />
              </div>
            </div>
          )}

          {wrapStats.monthlyActivity.some(n => n > 0) && (
            <div>
              <h3 className="heading-sm mb-4">Monthly Activity</h3>
              <div className="flex items-end gap-2 h-32 bg-surface border border-border rounded-sm p-4">
                {wrapStats.monthlyActivity.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-text-muted leading-none">{count || ''}</span>
                    <div className="w-full bg-accent rounded-sm transition-all" style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }} />
                    <span className="text-[10px] text-text-muted">{months[i].slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(wrapStats.ratingDist).length > 0 && (
            <div>
              <h3 className="heading-sm mb-4">Rating Distribution</h3>
              <div className="space-y-2 bg-surface border border-border rounded-sm p-4">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(r => {
                  const count = wrapStats.ratingDist[r] || 0
                  return (
                    <div key={r} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-4 text-right">{r}</span>
                      <div className="flex-1 h-3 bg-tag-bg rounded-sm overflow-hidden">
                        <div className="h-full bg-rating rounded-sm transition-all" style={{ width: `${(count / maxRating) * 100}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary w-6">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {wrapStats.topGenre && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h3 className="heading-sm mb-1">Top Genre</h3>
              <p className="heading-xl text-accent">{wrapStats.topGenre.name}</p>
              <p className="text-sm text-text-muted mt-1">{wrapStats.topGenre.count} entries</p>
            </div>
          )}

          {wrapStats.bestRated && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h3 className="heading-sm mb-1">Highest Rated</h3>
              <p className="heading-md text-text-primary">{wrapStats.bestRated.title}</p>
              <p className="flex items-center gap-1 text-sm text-rating mt-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                {wrapStats.bestRated.rating}/10
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-16 pt-8 border-t border-border">
        <h2 className="heading-sm text-accent mb-2">Danger zone</h2>
        <p className="text-sm text-text-secondary mb-4">
          Permanently delete your account and all entries. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-sm text-sm hover:bg-accent-light transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete my account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-accent font-medium">Are you sure?</span>
            <button onClick={handleDeleteAccount} disabled={deleting} className="px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Yes, delete everything'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-text-secondary mb-4">Delete all entries but keep your account.</p>
          {!confirmDeleteEntries ? (
            <button onClick={() => setConfirmDeleteEntries(true)} className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-sm text-sm hover:bg-accent-light transition-colors">
              <Trash2 className="w-4 h-4" />
              Delete all entries
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-accent font-medium">Type <span className="font-mono">DELETE</span> to confirm</p>
              <div className="flex items-center gap-3">
                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="px-3 py-2 border border-border rounded-sm text-sm bg-background text-text-primary w-32" />
                <button onClick={handleDeleteAllEntries} disabled={deleteConfirmText !== 'DELETE' || deletingEntries} className="px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50">
                  {deletingEntries ? 'Deleting...' : 'Confirm delete all'}
                </button>
                <button onClick={() => { setConfirmDeleteEntries(false); setDeleteConfirmText('') }} className="px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
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

function CompareStat({ label, current, previous, isRating }: { label: string; current: number; previous: number; isRating?: boolean }) {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const isUp = diff >= 0
  return (
    <div>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="heading-md text-text-primary">
        {isRating ? current.toFixed(1) : current}
        <span className="text-sm ml-1 text-text-muted">(was {isRating ? previous.toFixed(1) : previous})</span>
      </p>
      <p className={`text-xs mt-0.5 ${isUp ? 'text-green-600' : 'text-accent'}`}>
        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
      </p>
    </div>
  )
}
