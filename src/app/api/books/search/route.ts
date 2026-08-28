import { NextRequest, NextResponse } from 'next/server'
import { searchBooks } from '@/lib/book-providers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchBooks(query, limit)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('GET /api/books/search error:', error)
    return NextResponse.json({ error: 'Failed to search books' }, { status: 500 })
  }
}