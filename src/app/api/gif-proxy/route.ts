import { NextRequest, NextResponse } from 'next/server'

const OG_REGEX = /<meta[^>]+property=(?:"|')og:image(?:"|')\s+content=(?:"|')([^"']+)(?:"|')/i
const OG_REGEX_ALT = /<meta[^>]+content=(?:"|')([^"']+)(?:"|')\s+property=(?:"|')og:image(?:"|')/i

async function resolveTenorUrl(pageUrl: string): Promise<string | null> {
  const html = await fetch(pageUrl, {
    headers: { 'User-Agent': 'watch.ed/1.0' },
    signal: AbortSignal.timeout(10000),
  }).then((r) => r.text())

  return OG_REGEX.exec(html)?.[1] ?? OG_REGEX_ALT.exec(html)?.[1] ?? null
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
      headers: { 'User-Agent': 'watch.ed/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch GIF' }, { status: 502 })
    }

    const blob = await res.blob()
    const headers = new Headers({
      'Content-Type': res.headers.get('Content-Type') || 'image/gif',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    })

    return new NextResponse(blob, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'Failed to resolve GIF' }, { status: 502 })
  }
}
