'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Globe, Lock, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { List } from '@/types/database'

interface ListWithCount extends List {
  entry_count: number
}

export default function ListsPage() {
  const router = useRouter()
  const [lists, setLists] = useState<ListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPublic, setNewPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLists() {
    setLoading(true)
    const res = await fetch('/api/lists')
    if (res.ok) {
      const data = await res.json()
      setLists(data.lists || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadLists() }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null, is_public: newPublic }),
    })
    if (res.ok) {
      setShowCreate(false)
      setNewName('')
      setNewDescription('')
      setNewPublic(true)
      await loadLists()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create list')
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this list? Entries in the list will not be affected.')) return
    const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLists(lists.filter(l => l.id !== id))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-lg">Library</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New list
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 p-6 bg-surface border border-border rounded-sm">
          <h2 className="heading-sm mb-4">Create list</h2>
          <div className="space-y-3">
            <div>
              <label className="block body-xs text-text-muted mb-1">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Best Horror of 2024"
                className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>
            <div>
              <label className="block body-xs text-text-muted mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="A curated list of..."
                rows={2}
                className="w-full px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
                className="accent-accent"
              />
              Public (visible on your profile)
            </label>
            {error && <p className="text-sm text-accent">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setError(null) }}
                className="px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-sm p-5 animate-pulse">
              <div className="h-5 bg-tag-bg rounded w-3/4 mb-3" />
              <div className="h-4 bg-tag-bg rounded w-full mb-2" />
              <div className="h-4 bg-tag-bg rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-secondary mb-2">No lists yet</p>
          <p className="text-sm text-text-muted">Create your first curated collection</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-surface border border-border rounded-sm p-5 hover:border-accent/30 transition-colors group"
            >
              <Link href={`/dashboard/lists/${list.id}`} className="block">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="heading-sm truncate flex-1">{list.name}</h3>
                  <span className={`ml-2 flex-shrink-0 ${list.is_public ? 'text-text-muted' : 'text-text-muted'}`}>
                    {list.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </span>
                </div>
                {list.description && (
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">{list.description}</p>
                )}
                <p className="body-xs text-text-muted">
                  {list.entry_count} {list.entry_count === 1 ? 'entry' : 'entries'}
                </p>
              </Link>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/dashboard/lists/${list.id}`}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Edit
                </Link>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
