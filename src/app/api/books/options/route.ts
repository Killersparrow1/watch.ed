import { NextRequest, NextResponse } from 'next/server'
import { cleanIsbn, LiveBookInfo } from '@/lib/book-providers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || ''
    const author = searchParams.get('author') || ''
    const isbn = searchParams.get('isbn') || ''
    const olid = searchParams.get('open_library_id') || ''

    if (!title && !isbn) {
      return NextResponse.json({ error: 'Title or ISBN is required' }, { status: 400 })
    }

    const cleanIsbnValue = cleanIsbn(isbn)

    // Build Google Books query
    let googleQuery = ''
    if (cleanIsbnValue) {
      googleQuery = `isbn:${cleanIsbnValue}`
    } else {
      googleQuery = author ? `intitle:${title}+inauthor:${author}` : `intitle:${title}`
    }

    const googleApiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(googleQuery)}&maxResults=1&printType=books`

    let liveInfo: LiveBookInfo | null = null

    try {
      const googleRes = await fetch(googleApiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 },
      })

      if (googleRes.ok) {
        const googleData = await googleRes.json()
        const item = googleData.items?.[0]

        if (item) {
          const volumeInfo = item.volumeInfo || {}
          const saleInfo = item.saleInfo || {}
          const accessInfo = item.accessInfo || {}

          liveInfo = {
            googleBooksId: item.id,
            previewLink: volumeInfo.previewLink || null,
            webReaderLink: accessInfo.webReaderLink || null,
            buyLink: saleInfo.buyLink || null,
            isEbook: saleInfo.isEbook || false,
            embeddable: accessInfo.embeddable || false,
            retailPrice: saleInfo.retailPrice
              ? {
                  amount: saleInfo.retailPrice.amount,
                  currencyCode: saleInfo.retailPrice.currencyCode,
                }
              : undefined,
            description: volumeInfo.description || undefined,
            pageCount: volumeInfo.pageCount || undefined,
            categories: volumeInfo.categories || undefined,
            publisher: volumeInfo.publisher || undefined,
            publishedDate: volumeInfo.publishedDate || undefined,
            language: volumeInfo.language || undefined,
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Google Books live metadata:', e)
    }

    // Open Library Live Reader / Borrow Check if available
    let openLibraryData: Record<string, unknown> | null = null
    if (cleanIsbnValue) {
      try {
        const olBibKey = `ISBN:${cleanIsbnValue}`
        const olRes = await fetch(
          `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(olBibKey)}&format=json&jscmd=data`,
          { next: { revalidate: 3600 } }
        )
        if (olRes.ok) {
          const olJson = await olRes.json()
          openLibraryData = olJson[olBibKey] || null
        }
      } catch (e) {
        console.warn('Failed to fetch Open Library live metadata:', e)
      }
    }

    return NextResponse.json(
      {
        liveInfo,
        openLibraryData,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('GET /api/books/options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
