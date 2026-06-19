'use client'

import { useState, useEffect, useMemo } from 'react'
import { Entry } from '@/types/database'
import { Film, Tv, Star, Timer, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function WrappedPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  useEffect(() => {
    fetch('/api/entries?sort=created_at&order=desc').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
      setLoading(false)
    })
  }, [])

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

  const yearEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.watch_date) return false
      const d = new Date(e.watch_date)
      return !isNaN(d.getTime()) && d.getFullYear() === year
    })
  }, [entries, year])

  const prevYearEntries = useMemo(() => {
    return entries.filter(e => {
      if (!e.watch_date) return false
      const d = new Date(e.watch_date)
      return !isNaN(d.getTime()) && d.getFullYear() === year - 1
    })
  }, [entries, year])

  const stats = useMemo(() => {
    const movies = yearEntries.filter(e => e.type === 'movie')
    const series = yearEntries.filter(e => e.type === 'series')
    const completed = yearEntries.filter(e => e.status === 'completed')
    const rated = yearEntries.filter(e => e.rating !== null)
    const avgRating = rated.length
      ? (rated.reduce((s, e) => s + (e.rating || 0), 0) / rated.length).toFixed(1)
      : null

    const genreCount: Record<string, number> = {}
    yearEntries.forEach(e => {
      if (e.genres) e.genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1
      })
    })
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]

    const monthlyActivity: number[] = Array(12).fill(0)
    yearEntries.forEach(e => {
      if (e.watch_date) {
        const d = new Date(e.watch_date)
        if (!isNaN(d.getTime())) monthlyActivity[d.getMonth()]++
      }
    })

    const ratingDist: Record<number, number> = {}
    rated.forEach(e => {
      const r = e.rating || 0
      ratingDist[r] = (ratingDist[r] || 0) + 1
    })

    const bestRated = rated.length
      ? rated.reduce((best, e) => ((e.rating || 0) > (best.rating || 0) ? e : best))
      : null

    const badges = yearEntries.filter(e => e.badge).map(e => e.badge)

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

    const prevRated = prevYearEntries.filter(e => e.rating !== null)
    const prevAvg = prevRated.length
      ? (prevRated.reduce((s, e) => s + (e.rating || 0), 0) / prevRated.length).toFixed(1)
      : null

    return {
      movies: movies.length,
      series: series.length,
      completed: completed.length,
      avgRating,
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      monthlyActivity,
      ratingDist,
      bestRated,
      badges: [...new Set(badges)],
      totalHours,
      totalEntries: yearEntries.length,
      prevAvg,
      prevEntries: prevYearEntries.length,
    }
  }, [yearEntries, prevYearEntries])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-tag-bg rounded w-1/4" />
        <div className="h-12 bg-tag-bg rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-tag-bg rounded" />
          ))}
        </div>
      </div>
    )
  }

  const maxMonthly = Math.max(...stats.monthlyActivity, 1)
  const maxRating = Math.max(...Object.values(stats.ratingDist), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent" />
          Year in Review
        </h1>
        <div className="flex items-center gap-2">
          {years.length > 0 && (
            <div className="flex items-center gap-1 bg-surface border border-border rounded-sm">
              <button
                onClick={() => setYear(years[Math.min(years.indexOf(year) + 1, years.length - 1)])}
                disabled={year >= Math.max(...years)}
                className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-text-primary px-2 min-w-[4rem] text-center">
                {year}
              </span>
              <button
                onClick={() => setYear(years[Math.max(years.indexOf(year) - 1, 0)])}
                disabled={year <= Math.min(...years)}
                className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {year < currentYear && (
            <button
              onClick={() => setYear(currentYear)}
              className="text-xs text-accent hover:text-accent-hover px-2 py-1"
            >
              Back to {currentYear}
            </button>
          )}
        </div>
      </div>

      {stats.totalEntries === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-secondary mb-1">No entries for {year}</p>
          {year === currentYear && (
            <p className="text-sm text-text-muted">Start logging your watches to see your year in review</p>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={<Film className="w-5 h-5" />} label="Movies" value={String(stats.movies)} />
            <StatCard icon={<Tv className="w-5 h-5" />} label="Series" value={String(stats.series)} />
            <StatCard icon={<Timer className="w-5 h-5" />} label="Hours" value={String(stats.totalHours)} />
            <StatCard
              icon={<Star className="w-5 h-5 text-rating fill-current" />}
              label="Avg Rating"
              value={stats.avgRating || '—'}
            />
            <StatCard icon={<Film className="w-5 h-5" />} label="Total" value={String(stats.totalEntries)} />
          </div>

          {stats.prevEntries > 0 && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h2 className="heading-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-text-muted" />
                vs {year - 1}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <CompareStat
                  label="Entries"
                  current={stats.totalEntries}
                  previous={stats.prevEntries}
                />
                <CompareStat
                  label="Avg Rating"
                  current={stats.avgRating ? parseFloat(stats.avgRating) : 0}
                  previous={stats.prevAvg ? parseFloat(stats.prevAvg) : 0}
                  isRating
                />
              </div>
            </div>
          )}

          {stats.monthlyActivity.some(n => n > 0) && (
            <div>
              <h2 className="heading-sm mb-4">Monthly Activity</h2>
              <div className="flex items-end gap-2 h-32 bg-surface border border-border rounded-sm p-4">
                {stats.monthlyActivity.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-text-muted leading-none">{count || ''}</span>
                    <div
                      className="w-full bg-accent rounded-sm transition-all"
                      style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    <span className="text-[10px] text-text-muted">{months[i].slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(stats.ratingDist).length > 0 && (
            <div>
              <h2 className="heading-sm mb-4">Rating Distribution</h2>
              <div className="space-y-2 bg-surface border border-border rounded-sm p-4">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(r => {
                  const count = stats.ratingDist[r] || 0
                  return (
                    <div key={r} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-4 text-right">{r}</span>
                      <div className="flex-1 h-3 bg-tag-bg rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-rating rounded-sm transition-all"
                          style={{ width: `${(count / maxRating) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary w-6">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {stats.topGenre && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h2 className="heading-sm mb-1">Top Genre</h2>
              <p className="heading-xl text-accent">{stats.topGenre.name}</p>
              <p className="text-sm text-text-muted mt-1">{stats.topGenre.count} entries</p>
            </div>
          )}

          {stats.bestRated && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h2 className="heading-sm mb-1">Highest Rated</h2>
              <p className="heading-md text-text-primary">{stats.bestRated.title}</p>
              <p className="flex items-center gap-1 text-sm text-rating mt-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                {stats.bestRated.rating}/10
              </p>
            </div>
          )}

          {stats.badges.length > 0 && (
            <div className="bg-surface border border-border rounded-sm p-5">
              <h2 className="heading-sm mb-3">Badges Earned</h2>
              <div className="flex flex-wrap gap-2">
                {stats.badges.map(badge => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-tag-bg border border-border rounded-sm text-xs font-medium text-text-primary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface border border-border rounded-sm p-5">
      <div className="text-text-muted mb-2">{icon}</div>
      <p className="heading-xl mb-1">{value}</p>
      <p className="body-small text-text-secondary">{label}</p>
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
        <span className="text-sm ml-1 text-text-muted">
          (was {isRating ? previous.toFixed(1) : previous})
        </span>
      </p>
      <p className={`text-xs mt-0.5 ${isUp ? 'text-green-600' : 'text-accent'}`}>
        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
      </p>
    </div>
  )
}
