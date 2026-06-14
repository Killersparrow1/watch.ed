import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'watch.ed/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 })
    }

    const blob = await res.blob()
    const headers = new Headers({
      'Content-Type': res.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    })

    return new NextResponse(blob, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  }
}
