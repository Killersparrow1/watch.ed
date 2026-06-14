'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

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
        .select('bio, avatar_url, username')
        .eq('id', user.id)
        .single()
      if (data) {
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || '')
        setUsername(data.username)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save')
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

        {error && (
          <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm">{error}</p>
        )}

        {success && (
          <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-sm">Bio saved</p>
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
