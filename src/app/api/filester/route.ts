import { NextRequest, NextResponse } from 'next/server'

const FILESTER_API = 'https://filester.sh/api/public/download'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const resolvedCache = new Map<string, { url: string; expires: number }>()

function cachedResolve(slug: string): string | undefined {
  const entry = resolvedCache.get(slug)
  if (entry && Date.now() < entry.expires) return entry.url
  resolvedCache.delete(slug)
}

function setCache(slug: string, url: string) {
  resolvedCache.set(slug, { url, expires: Date.now() + 25 * 60 * 1000 })
  if (resolvedCache.size > 500) {
    const first = resolvedCache.keys().next().value
    if (first) resolvedCache.delete(first)
  }
}

async function resolveDirectUrl(slug: string): Promise<string | null> {
  const cached = cachedResolve(slug)
  if (cached) return cached

  try {
    const res = await fetch(FILESTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ file_slug: slug }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const server: string | undefined = data.server
    const path: string | undefined = data.download_url
    if (!server || !path) return null
    const url = `${server}${path}`
    setCache(slug, url)
    return url
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug param' }, { status: 400 })
  }

  const directUrl = await resolveDirectUrl(slug)
  if (!directUrl) {
    return NextResponse.json({ error: 'Could not resolve file' }, { status: 502 })
  }

  if (request.nextUrl.searchParams.get('check') === '1') {
    try {
      const res = await fetch(directUrl, {
        headers: { 'User-Agent': UA, Range: 'bytes=0-2047' },
        signal: AbortSignal.timeout(12000),
      })
      const contentType = res.headers.get('Content-Type') || 'application/octet-stream'
      return NextResponse.json({ ok: res.ok || res.status === 206, type: contentType })
    } catch {
      return NextResponse.json({ ok: false }, { status: 502 })
    }
  }

  try {
    const range = request.headers.get('range')
    const headers: Record<string, string> = { 'User-Agent': UA, Accept: '*/*' }
    if (range) headers.Range = range

    const upstream = await fetch(directUrl, { headers, signal: AbortSignal.timeout(20000) })
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
    }

    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
    })
    for (const name of ['Content-Length', 'Accept-Ranges', 'Content-Range']) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 })
  }
}