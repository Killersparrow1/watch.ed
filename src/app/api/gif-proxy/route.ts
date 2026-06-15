import { NextRequest, NextResponse } from 'next/server'

const OG_REGEX = /<meta[^>]+property=(?:"|')og:image(?:"|')\s+content=(?:"|')([^"']+)(?:"|')/i
const OG_REGEX_ALT = /<meta[^>]+content=(?:"|')([^"']+)(?:"|')\s+property=(?:"|')og:image(?:"|')/i
const TENOR_ID_RE = /\/view\/(?:[^/]+-)?(\d+)/

const UA = 'watch.ed/1.0'
const MAX_AGE = 86400

const resolvedCache = new Map<string, { gifUrl: string; expires: number }>()

function cachedResolve(pageUrl: string): string | undefined {
  const entry = resolvedCache.get(pageUrl)
  if (entry && Date.now() < entry.expires) return entry.gifUrl
  resolvedCache.delete(pageUrl)
}

function setCache(pageUrl: string, gifUrl: string) {
  resolvedCache.set(pageUrl, { gifUrl, expires: Date.now() + MAX_AGE * 1000 })
  if (resolvedCache.size > 500) {
    const first = resolvedCache.keys().next().value
    if (first) resolvedCache.delete(first)
  }
}

async function extractOgImage(html: string): Promise<string | null> {
  return OG_REGEX.exec(html)?.[1] ?? OG_REGEX_ALT.exec(html)?.[1] ?? null
}

async function resolveTenorUrl(pageUrl: string): Promise<string | null> {
  const cached = cachedResolve(pageUrl)
  if (cached) return cached

  const id = TENOR_ID_RE.exec(pageUrl)?.[1]

  try {
    const html = await fetch(pageUrl, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.text())

    let gifUrl = await extractOgImage(html)
    if (gifUrl) {
      setCache(pageUrl, gifUrl)
      return gifUrl
    }
  } catch {}

  if (id) {
    try {
      const embedHtml = await fetch(`https://tenor.com/embed/${id}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.text())

      const gifUrl = await extractOgImage(embedHtml)
      if (gifUrl) {
        setCache(pageUrl, gifUrl)
        return gifUrl
      }
    } catch {}
  }

  return null
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  try {
    const gifUrl = await resolveTenorUrl(url)
    if (!gifUrl) {
      return NextResponse.json({ error: 'Could not extract GIF URL' }, { status: 502 })
    }

    const res = await fetch(gifUrl, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch GIF' }, { status: 502 })
    }

    const blob = await res.blob()
    const headers = new Headers({
      'Content-Type': res.headers.get('Content-Type') || 'image/gif',
      'Cache-Control': `public, max-age=${MAX_AGE}, s-maxage=${MAX_AGE}`,
      'Access-Control-Allow-Origin': '*',
    })

    return new NextResponse(blob, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'Failed to resolve GIF' }, { status: 502 })
  }
}
