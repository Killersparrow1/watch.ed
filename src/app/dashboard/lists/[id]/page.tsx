'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Plus, X, GripVertical, Globe, Lock, Save } from 'lucide-react'
import type { Entry, List } from '@/types/database'
import { getEntryPosterUrl } from '@/lib/tmdb'

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [list, setList] = useState<List | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [allUserEntries, setAllUserEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingPublic, setEditingPublic] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const [listRes, entriesRes, allRes] = await Promise.all([
      fetch(`/api/lists/${id}`),
      fetch(`/api/lists/${id}/entries`),
      fetch('/api/entries?sort=title&order=asc'),
    ])

    if (listRes.ok) {
      const listData = await listRes.json()
      setList(listData.list)
      setEditingName(listData.list.name)
      setEditingDescription(listData.list.description || '')
      setEditingPublic(listData.list.is_public)
    }
    if (entriesRes.ok) {
      const entriesData = await entriesRes.json()
      setEntries(entriesData.entries || [])
    }
    if (allRes.ok) {
      const allData = await allRes.json()
      setAllUserEntries(allData.entries || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const availableEntries = useMemo(() => {
    const entryIds = new Set(entries.map(e => e.id))
    const query = searchQuery.toLowerCase().trim()
    return allUserEntries.filter(e => {
      if (entryIds.has(e.id)) return false
      if (!query) return true
      return e.title.toLowerCase().includes(query) ||
        (e.year && String(e.year).includes(query))
    })
  }, [allUserEntries, entries, searchQuery])

  async function handleAddEntry(entryId: string) {
    const res = await fetch(`/api/lists/${id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })
    if (res.ok) {
      const addedEntry = allUserEntries.find(e => e.id === entryId)
      if (addedEntry) {
        setEntries([...entries, addedEntry])
      }
    }
  }

  async function handleRemoveEntry(entryId: string) {
    const res = await fetch(`/api/lists/${id}/entries`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })
    if (res.ok) {
      setEntries(entries.filter(e => e.id !== entryId))
    }
  }

  async function handleMoveEntry(fromIndex: number, toIndex: number) {
    const newEntries = [...entries]
    const [moved] = newEntries.splice(fromIndex, 1)
    newEntries.splice(toIndex, 0, moved)
    setEntries(newEntries)
  }

  async function handleSaveReorder() {
    const reorderData = entries.map((e, i) => ({
      id: e.id,
      position: i,
    }))
    await fetch(`/api/lists/${id}/entries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: reorderData }),
    })
  }

  async function handleSaveMetadata() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingName.trim(),
        description: editingDescription.trim() || null,
        is_public: editingPublic,
      }),
    })
    if (res.ok) {
      setHasChanges(false)
      const data = await res.json()
      setList(data.list)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-tag-bg rounded w-48 mb-8 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-sm overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-tag-bg" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-tag-bg rounded w-3/4" />
                <div className="h-3 bg-tag-bg rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!list) {
    return <div className="text-center py-20"><p className="text-text-secondary">List not found</p></div>
  }

  return (
    <div>
      <Link
        href="/dashboard/lists"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to lists
      </Link>

      <div className="bg-surface border border-border rounded-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={editingName}
              onChange={(e) => { setEditingName(e.target.value); setHasChanges(true) }}
              className="heading-lg bg-transparent border-none outline-none w-full text-text-primary placeholder:text-text-muted"
              placeholder="List name"
            />
            <textarea
              value={editingDescription}
              onChange={(e) => { setEditingDescription(e.target.value); setHasChanges(true) }}
              rows={2}
              className="w-full mt-1 bg-transparent border-none outline-none text-sm text-text-secondary placeholder:text-text-muted resize-none"
              placeholder="Add a description..."
            />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs cursor-pointer transition-colors ${editingPublic ? 'bg-tag-bg text-text-secondary' : 'bg-tag-bg text-text-muted'}`}>
              <input
                type="checkbox"
                checked={editingPublic}
                onChange={(e) => { setEditingPublic(e.target.checked); setHasChanges(true) }}
                className="sr-only"
              />
              {editingPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {editingPublic ? 'Public' : 'Private'}
            </label>
          </div>
        </div>

        {hasChanges && (
          <button
            onClick={handleSaveMetadata}
            disabled={saving || !editingName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
        {error && <p className="text-sm text-accent mt-2">{error}</p>}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-sm">
            Entries <span className="text-text-muted">({entries.length})</span>
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-sm">
            <p className="text-text-secondary mb-1">No entries in this list yet</p>
            <p className="text-sm text-text-muted">Search your entries below to add them</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {entries.map((entry, index) => {
              const posterUrl = getEntryPosterUrl(entry, 'w185')
              return (
                <div key={entry.id} className="group relative bg-surface border border-border rounded-sm overflow-hidden">
                  <div className="aspect-[2/3] bg-tag-bg relative">
                    {posterUrl ? (
                      <img src={posterUrl} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
                        {entry.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="p-1.5 bg-accent text-white rounded-full"
                        title="Remove from list"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-text-primary truncate font-medium">{entry.title}</p>
                    <p className="body-xs text-text-muted">{entry.year || ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="heading-sm mb-4">Add entries</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search your entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border bg-surface rounded-sm text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {availableEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {availableEntries.slice(0, 30).map((entry) => {
              const posterUrl = getEntryPosterUrl(entry, 'w185')
              return (
                <div key={entry.id} className="group relative bg-surface border border-border rounded-sm overflow-hidden cursor-pointer" onClick={() => handleAddEntry(entry.id)}>
                  <div className="aspect-[2/3] bg-tag-bg relative">
                    {posterUrl ? (
                      <img src={posterUrl} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs p-2 text-center">
                        {entry.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="p-1.5 bg-accent text-white rounded-full" title="Add to list">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-text-primary truncate font-medium">{entry.title}</p>
                    <p className="body-xs text-text-muted">{entry.year || ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">
            {searchQuery ? 'No matching entries found' : 'All your entries are already in this list'}
          </p>
        )}
      </div>
    </div>
  )
}
