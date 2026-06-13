'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'

interface ColumnMapping {
  source: string
  target: string
}

const TARGET_FIELDS = [
  { value: 'title', label: 'Title *', required: true },
  { value: 'type', label: 'Type (movie/series)', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'rating', label: 'Rating', required: false },
  { value: 'year', label: 'Year', required: false },
  { value: 'watch_date', label: 'Watch Date', required: false },
  { value: 'notes', label: 'Notes/Review', required: false },
  { value: 'genres', label: 'Genres (comma-sep)', required: false },
  { value: 'tmdb_id', label: 'TMDB ID', required: false },
  { value: 'overview', label: 'Overview', required: false },
  { value: '_skip', label: 'Skip column', required: false },
]

const LETTERBOXD_FIELDS: Record<string, string> = {
  'Name': 'title',
  'Year': 'year',
  'Rating': 'rating',
  'Review': 'notes',
  'Watched Date': 'watch_date',
  'Genre': 'genres',
}

export default function ImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  function parseCSV(text: string) {
    try {
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row')
        return
      }

      const parsed = lines.map(l => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < l.length; i++) {
          const char = l[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      })

      const headerRow = parsed[0]
      const dataRows = parsed.slice(1).filter(row => row.some(cell => cell.length > 0))

      if (headerRow.length === 0) {
        setError('Could not parse CSV headers')
        return
      }

      setHeaders(headerRow)
      setCsvData(dataRows)
      setError(null)

      const autoMappings: ColumnMapping[] = headerRow.map(h => ({
        source: h,
        target: LETTERBOXD_FIELDS[h] || '',
      }))

      setMappings(autoMappings)
      generatePreview(headerRow, dataRows, autoMappings)

      if (autoMappings.some(m => m.target === 'title')) {
        setStep('preview')
      } else {
        setStep('map')
      }
    } catch {
      setError('Failed to parse CSV file')
    }
  }

  function generatePreview(headers: string[], rows: string[][], mappings: ColumnMapping[]) {
    const preview = rows.slice(0, 5).map(row => {
      const obj: Record<string, string> = {}
      mappings.forEach(m => {
        const idx = headers.indexOf(m.source)
        if (idx !== -1 && m.target !== '_skip') {
          obj[m.target] = row[idx] || ''
        }
      })
      return obj
    })
    setPreviewRows(preview)
  }

  function updateMapping(sourceIndex: number, target: string) {
    const newMappings = [...mappings]
    newMappings[sourceIndex] = { ...newMappings[sourceIndex], target }
    setMappings(newMappings)
    generatePreview(headers, csvData, newMappings)
  }

  async function handleImport() {
    setImporting(true)
    setError(null)

    const titleMapping = mappings.find(m => m.target === 'title')
    if (!titleMapping) {
      setError('Title field must be mapped')
      setImporting(false)
      return
    }

    const entries = csvData.map(row => {
      const entry: Record<string, unknown> = {}

      mappings.forEach(m => {
        if (m.target === '_skip') return
        const idx = headers.indexOf(m.source)
        if (idx === -1) return
        const value = row[idx] || ''

        switch (m.target) {
          case 'rating': {
            const parsed = value ? parseFloat(value) : null
            let ratingVal = parsed
            if (ratingVal !== null && ratingVal > 10) ratingVal = ratingVal / 2
            if (ratingVal !== null) ratingVal = Math.round(ratingVal)
            entry.rating = ratingVal
            break
          }
          case 'year':
            entry.year = value ? parseInt(value) : null
            break
          case 'type': {
            const lower = value.toLowerCase()
            entry.type = lower.includes('tv') || lower.includes('series') || lower === 'show' ? 'series' : 'movie'
            break
          }
          case 'status': {
            const s = value.toLowerCase().replace(/\s+/g, '_')
            entry.status = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'].includes(s) ? s : 'completed'
            break
          }
          case 'genres':
            entry.genres = value ? value.split(/[,/]/).map((g: string) => g.trim()).filter(Boolean) : null
            break
          default:
            entry[m.target] = value
        }
      })

      if (!entry.type) entry.type = 'movie'
      if (!entry.status) entry.status = 'completed'

      return entry
    }).filter(e => e.title && typeof e.title === 'string' && e.title.trim())

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Import failed')
      setImporting(false)
      return
    }

    setResult({ imported: data.imported, total: data.total })
    setStep('result')
    setImporting(false)
  }

  return (
    <div>
      <h1 className="heading-lg mb-8">Import</h1>

      <div className="max-w-2xl">
        <div className="bg-surface border border-border rounded-sm p-6 mb-8">
          <h2 className="heading-sm mb-3">How it works</h2>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">1.</span>
              <span>Export your data from Letterboxd, Trakt, or any service that provides a CSV</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">2.</span>
              <span>Upload the CSV file below — we&apos;ll try to auto-map the columns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">3.</span>
              <span>Review the mapping and preview the data before importing</span>
            </li>
          </ul>
        </div>

        {step === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-sm p-12 text-center cursor-pointer hover:border-accent transition-colors"
          >
            <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              Click to upload a CSV file
            </p>
            <p className="body-xs text-text-muted mt-1">
              Supports Letterboxd, Trakt exports, and generic CSV
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Map your CSV columns to watch.ed fields:
            </p>
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-text-muted w-32 truncate" title={m.source}>
                  {m.source}
                </span>
                <span className="text-text-muted">→</span>
                <select
                  value={m.target}
                  onChange={(e) => updateMapping(i, e.target.value)}
                  className="flex-1 px-3 py-2 border border-border bg-bg rounded-sm text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {TARGET_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('preview')}
                disabled={!mappings.some(m => m.target === 'title')}
                className="px-4 py-2 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Preview
              </button>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Previewing first {previewRows.length} of {csvData.length} rows:
              </p>
              <button
                onClick={() => setStep('map')}
                className="text-sm text-accent hover:text-accent-hover"
              >
                Adjust mapping
              </button>
            </div>

            <div className="overflow-x-auto border border-border rounded-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-tag-bg">
                    {Object.keys(previewRows[0] || {}).map(key => (
                      <th key={key} className="text-left px-3 py-2 text-text-secondary font-medium body-xs">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-text-primary truncate max-w-48">
                          {val || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${csvData.length} entries`}
              </button>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>

            {error && (
              <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        )}

        {step === 'result' && result && (
          <div className="bg-surface border border-border rounded-sm p-8 text-center">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
            <h2 className="heading-md mb-2">Import complete</h2>
            <p className="text-text-secondary mb-6">
              Successfully imported {result.imported} of {result.total} entries.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-accent text-white rounded-sm text-sm hover:bg-accent-hover transition-colors font-medium"
              >
                View entries
              </button>
              <button
                onClick={() => { setStep('upload'); setResult(null); setCsvData([]); setHeaders([]); setMappings([]); setPreviewRows([]); }}
                className="px-6 py-2.5 border border-border rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Import another
              </button>
            </div>
          </div>
        )}

        {error && step === 'upload' && (
          <p className="text-sm text-accent bg-accent-light px-3 py-2 rounded-sm mt-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
