export interface BookProviderOption {
  id: string
  name: string
  category: 'read' | 'buy' | 'audio'
  url: string
  description: string
  iconName: 'book-open' | 'library' | 'shopping-bag' | 'headphones' | 'globe' | 'sparkles'
  badge?: string
  isDirect?: boolean
  accentColor: string
}

export interface LiveBookInfo {
  googleBooksId?: string
  previewLink?: string
  webReaderLink?: string
  buyLink?: string
  isEbook?: boolean
  embeddable?: boolean
  retailPrice?: {
    amount: number
    currencyCode: string
  }
  description?: string
  pageCount?: number
  categories?: string[]
  publisher?: string
  publishedDate?: string
  language?: string
}

export interface BookSearchResult {
  id: string
  title: string
  authors?: string[]
  cover_url?: string
  open_library_id?: string
  isbn?: string
  published_date?: string
  page_count?: number
  description?: string
  publisher?: string
  source: 'openlibrary' | 'googlebooks'
}

export function cleanIsbn(raw?: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9X]/gi, '').trim()
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned
  }
  return null
}

export function getBookProviderOptions(params: {
  title: string
  authors?: string[] | null
  isbn?: string | null
  open_library_id?: string | null
}): {
  readOptions: BookProviderOption[]
  buyOptions: BookProviderOption[]
  audioOptions: BookProviderOption[]
} {
  const { title, authors, isbn, open_library_id } = params
  const primaryAuthor = authors && authors.length > 0 ? authors[0] : ''
  const authorQuery = authors && authors.length > 0 ? authors.join(' ') : ''
  const cleanIsbnValue = cleanIsbn(isbn)
  const baseQuery = primaryAuthor ? `${title} ${primaryAuthor}`.trim() : title.trim()
  const encodedQuery = encodeURIComponent(baseQuery)
  const encodedTitle = encodeURIComponent(title.trim())

  // --- Reading / Borrowing Providers ---
  const readOptions: BookProviderOption[] = []

  // 1. Open Library
  let openLibraryUrl = `https://openlibrary.org/search?q=${encodedQuery}`
  let olDirect = false
  if (cleanIsbnValue) {
    openLibraryUrl = `https://openlibrary.org/isbn/${cleanIsbnValue}`
    olDirect = true
  } else if (open_library_id) {
    if (open_library_id.startsWith('OL') && open_library_id.endsWith('M')) {
      openLibraryUrl = `https://openlibrary.org/books/${open_library_id}`
      olDirect = true
    } else if (open_library_id.startsWith('OL') && open_library_id.endsWith('W')) {
      openLibraryUrl = `https://openlibrary.org/works/${open_library_id}`
      olDirect = true
    }
  }

  readOptions.push({
    id: 'open_library',
    name: 'Open Library',
    category: 'read',
    url: openLibraryUrl,
    description: 'Borrow or read free open-access digital editions and loans',
    iconName: 'library',
    badge: 'Free / Borrow',
    isDirect: olDirect,
    accentColor: 'from-amber-600 to-amber-700',
  })

  // 2. Libby by OverDrive (Public Libraries)
  readOptions.push({
    id: 'libby',
    name: 'Libby / OverDrive',
    category: 'read',
    url: `https://libbyapp.com/search/query-${encodedQuery}/page-1`,
    description: 'Borrow free ebooks & audiobooks with your library card',
    iconName: 'library',
    badge: 'Library Card',
    isDirect: false,
    accentColor: 'from-rose-600 to-pink-700',
  })

  // --- Buying / Store Providers ---
  const buyOptions: BookProviderOption[] = []

  // 1. Amazon / Kindle
  const amazonQuery = cleanIsbnValue || baseQuery
  buyOptions.push({
    id: 'amazon',
    name: 'Amazon & Kindle',
    category: 'buy',
    url: `https://www.amazon.com/s?k=${encodeURIComponent(amazonQuery)}&i=stripbooks`,
    description: 'Paperback, Hardcover, Kindle e-book & 1-Day Delivery',
    iconName: 'shopping-bag',
    badge: 'Store',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-amber-500 to-orange-600',
  })

  // 2. Bookshop.org (Local indie bookstores)
  const bookshopQuery = cleanIsbnValue || baseQuery
  buyOptions.push({
    id: 'bookshop',
    name: 'Bookshop.org',
    category: 'buy',
    url: `https://bookshop.org/books?keywords=${encodeURIComponent(bookshopQuery)}`,
    description: 'Support local independent bookstores directly with your purchase',
    iconName: 'shopping-bag',
    badge: 'Support Indies',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-red-600 to-rose-700',
  })

  // 3. ThriftBooks (Pre-owned & Used)
  const thriftQuery = cleanIsbnValue || baseQuery
  buyOptions.push({
    id: 'thriftbooks',
    name: 'ThriftBooks',
    category: 'buy',
    url: `https://www.thriftbooks.com/browse/?b.search=${encodeURIComponent(thriftQuery)}`,
    description: 'Affordable, sustainable new & pre-loved used copies',
    iconName: 'shopping-bag',
    badge: 'Used / Deals',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-teal-600 to-cyan-700',
  })

  // --- Audiobook Providers ---
  const audioOptions: BookProviderOption[] = []

  // 1. Audible
  audioOptions.push({
    id: 'audible',
    name: 'Audible',
    category: 'audio',
    url: `https://www.audible.com/search?keywords=${encodedQuery}`,
    description: 'Official audiobook narration, voice actors & offline listening',
    iconName: 'headphones',
    badge: 'Audiobook',
    isDirect: false,
    accentColor: 'from-amber-600 to-yellow-600',
  })

  // 2. Libro.fm (Support indie bookstores via audiobooks)
  audioOptions.push({
    id: 'libro_fm',
    name: 'Libro.fm',
    category: 'audio',
    url: `https://libro.fm/search?q=${encodedQuery}`,
    description: 'DRM-free audiobooks that support local indie bookstores',
    iconName: 'headphones',
    badge: 'Indie Audio',
    isDirect: false,
    accentColor: 'from-sky-600 to-blue-700',
  })

  return {
    readOptions,
    buyOptions,
    audioOptions,
  }
}

export async function searchOpenLibrary(query: string, limit = 10): Promise<BookSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}&fields=key,title,author_name,cover_i,isbn,first_publish_year,number_of_pages_median,description,publisher`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []

    const data = await res.json()
    return (data.docs || []).map((doc: Record<string, unknown>) => ({
      id: `ol-${doc.key?.toString().replace('/works/', '')}`,
      title: doc.title as string,
      authors: doc.author_name as string[] || [],
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
      open_library_id: (doc.key as string)?.replace('/works/', ''),
      isbn: doc.isbn ? (doc.isbn as string[])[0] : undefined,
      published_date: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
      page_count: doc.number_of_pages_median as number || undefined,
      description: typeof doc.description === 'string' ? doc.description : (doc.description as { value?: string }[])?.[0]?.value || undefined,
      publisher: doc.publisher ? (doc.publisher as string[])[0] : undefined,
      source: 'openlibrary',
    }))
  } catch (e) {
    console.warn('Open Library search failed:', e)
    return []
  }
}

export async function searchGoogleBooks(query: string, limit = 10): Promise<BookSearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${limit}&printType=books`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []

    const data = await res.json()
    return (data.items || []).map((item: Record<string, unknown>) => {
      const volumeInfo = (item.volumeInfo || {}) as Record<string, unknown>
      const imageLinks = (volumeInfo.imageLinks || {}) as Record<string, unknown>
      const industryIds = (volumeInfo.industryIdentifiers || []) as Array<{ type: string; identifier: string }>
      const isbn13 = industryIds.find(i => i.type === 'ISBN_13')?.identifier
      const isbn10 = industryIds.find(i => i.type === 'ISBN_10')?.identifier
      return {
        id: `gb-${item.id}`,
        title: volumeInfo.title as string,
        authors: volumeInfo.authors as string[] || [],
        cover_url: (imageLinks.thumbnail as string)?.replace('http:', 'https:')?.replace('zoom=1', 'zoom=2'),
        isbn: isbn13 || isbn10,
        published_date: (volumeInfo.publishedDate as string)?.slice(0, 4),
        page_count: volumeInfo.pageCount as number || undefined,
        description: volumeInfo.description as string || undefined,
        publisher: volumeInfo.publisher as string || undefined,
        source: 'googlebooks',
      }
    })
  } catch (e) {
    console.warn('Google Books search failed:', e)
    return []
  }
}

export async function searchBooks(query: string, limit = 10): Promise<BookSearchResult[]> {
  const [olResults, gbResults] = await Promise.all([
    searchOpenLibrary(query, Math.ceil(limit / 2)),
    searchGoogleBooks(query, Math.ceil(limit / 2)),
  ])

  const seen = new Set<string>()
  const merged: BookSearchResult[] = []

  for (const result of [...olResults, ...gbResults]) {
    const key = result.isbn || result.title.toLowerCase().replace(/\s+/g, '')
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(result)
    }
  }

  return merged.slice(0, limit)
}
