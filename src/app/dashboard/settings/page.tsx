'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, Copy, Check, ExternalLink, Target, Upload, Download } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [goalYear, setGoalYear] = useState(new Date().getFullYear())
  const [movieTarget, setMovieTarget] = useState('')
  const [seriesTarget, setSeriesTarget] = useState('')
  const [episodeTarget, setEpisodeTarget] = useState('')
  const [hourTarget, setHourTarget] = useState('')
  const [goalsLoading, setGoalsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('bio, avatar_url, username, instagram_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || '')
        setInstagramUrl(data.instagram_url || '')
        setUsername(data.username)
      }
      const goalsRes = await fetch(`/api/goals?year=${new Date().getFullYear()}`)
      if (goalsRes.ok) {
        const gData = await goalsRes.json()
        setMovieTarget(String(gData.goal.movie_target || ''))
        setSeriesTarget(String(gData.goal.series_target || ''))
        setEpisodeTarget(String(gData.goal.episode_target || ''))
        setHourTarget(String(gData.goal.hour_target || ''))
      }
      setGoalsLoading(false)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setUsernameError(null)
    setSuccess(false)

    const [profileRes] = await Promise.all([
      fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          username: username.trim(),
        }),
      }),
      fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: goalYear,
          movie_target: parseInt(movieTarget) || 0,
          series_target: parseInt(seriesTarget) || 0,
          episode_target: parseInt(episodeTarget) || 0,
          hour_target: parseInt(hourTarget) || 0,
        }),
      }),
    ])

    if (!profileRes.ok) {
      const data = await profileRes.json()
      if (profileRes.status === 409) {
        setUsernameError(data.error || 'Username taken')
      } else {
        setError(data.error || 'Failed to save')
      }
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-tag-bg rounded w-1/3" />
        <div className="h-24 bg-tag-bg rounded w-full max-w-lg" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="heading-lg mb-8">Settings</h1>

      <form onSubmit={handleSave} className="max-w-lg space-y-5">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted select-none pointer-events-none">
              watch-ed.vercel.app/
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                setUsernameError(null)
              }}
              className={`w-full pl-[10.5rem] pr-4 py-2.5 border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors ${
                usernameError ? 'border-accent' : 'border-border'
              }`}
              placeholder="your-name"
            />
          </div>
          {usernameError ? (
            <p className="mt-1 text-xs text-accent">{usernameError}</p>
          ) : (
            <p className="mt-1 text-xs text-text-muted">3-30 characters: letters, numbers, underscores, hyphens</p>
          )}
        </div>

        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium text-text-primary mb-1.5">
            Profile picture URL
          </label>
          <p className="text-xs text-text-muted mb-2">
            Upload an image to{' '}
            <a href="https://postimages.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
              postimages.org
            </a>
            {' '}and paste the direct link here.
          </p>
          <input
            id="avatar_url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="https://i.postimg.cc/..."
          />
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Profile preview"
              className="mt-2 w-16 h-16 rounded-full object-cover border-2 border-border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>

        <div>
          <label htmlFor="instagram_url" className="block text-sm font-medium text-text-primary mb-1.5">
            Instagram
          </label>
          <input
            id="instagram_url"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            placeholder="https://www.instagram.com/yourhandle/"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-text-primary mb-1.5">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            className="w-full px-4 py-2.5 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-y"
            placeholder="A little about you..."
          />
          <p className="mt-1 text-xs text-text-muted">{bio.length}/200</p>
        </div>

        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Yearly Goals
          </h2>
          {goalsLoading ? (
            <div className="h-16 bg-tag-bg rounded-sm animate-pulse" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block body-xs text-text-muted mb-1">Movies target</label>
                <input
                  type="number"
                  min="0"
                  value={movieTarget}
                  onChange={(e) => setMovieTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block body-xs text-text-muted mb-1">Series target</label>
                <input
                  type="number"
                  min="0"
                  value={seriesTarget}
                  onChange={(e) => setSeriesTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label className="block body-xs text-text-muted mb-1">Episode target</label>
                <input
                  type="number"
                  min="0"
                  value={episodeTarget}
                  onChange={(e) => setEpisodeTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block body-xs text-text-muted mb-1">Hours target</label>
                <input
                  type="number"
                  min="0"
                  value={hourTarget}
                  onChange={(e) => setHourTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. 200"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm">{error}</p>
        )}

        {success && (
          <div className="text-sm text-success bg-success/10 px-3 py-2 rounded-sm">
            Settings saved
            {username && (
              <span className="block mt-1 text-xs text-text-secondary">
                Profile URL: <span className="text-accent">watch-ed.vercel.app/{username}</span>
              </span>
            )}
          </div>
        )}

        {username && (
          <div className="pt-6 border-t border-border">
            <h2 className="text-sm font-medium text-text-primary mb-3">Share your profile</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`https://watch-ed.vercel.app/${username}`}
                className="flex-1 px-4 py-2.5 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`https://watch-ed.vercel.app/${username}`)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  } catch {
                    const ta = document.createElement('textarea')
                    ta.value = `https://watch-ed.vercel.app/${username}`
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <Link
                href={`/${username}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" />
            Import
          </h2>
          <p className="text-xs text-text-secondary mb-3">
            Import your data from Letterboxd, IMDb, Trakt, Simkl, or CSV/JSON files.
          </p>
          <Link
            href="/dashboard/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Upload className="w-4 h-4" />
            Open Import
          </Link>
        </div>

        <div className="pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            Export
          </h2>
          <p className="text-xs text-text-secondary mb-3">
            Download your entries as CSV or JSON.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="/api/export?format=csv"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </a>
            <a
              href="/api/export?format=json"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </a>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
