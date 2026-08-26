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

  // 2. Google Books Preview & Reader
  const googleBooksUrl = cleanIsbnValue
    ? `https://books.google.com/books?vid=ISBN${cleanIsbnValue}`
    : `https://www.google.com/search?tbm=bks&q=${encodedQuery}`

  readOptions.push({
    id: 'google_books',
    name: 'Google Books',
    category: 'read',
    url: googleBooksUrl,
    description: 'Digital preview, table of contents & sample reader',
    iconName: 'book-open',
    badge: 'Preview / Reader',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-blue-600 to-indigo-600',
  })

  // 3. Internet Archive
  const archiveUrl = cleanIsbnValue
    ? `https://archive.org/search?query=isbn%3A${cleanIsbnValue}`
    : `https://archive.org/search?query=${encodedQuery}&sin=TXT`

  readOptions.push({
    id: 'internet_archive',
    name: 'Internet Archive',
    category: 'read',
    url: archiveUrl,
    description: 'Universal digital library with millions of scannable books',
    iconName: 'globe',
    badge: 'Lending Library',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-zinc-700 to-zinc-800',
  })

  // 4. Project Gutenberg
  readOptions.push({
    id: 'project_gutenberg',
    name: 'Project Gutenberg',
    category: 'read',
    url: `https://www.gutenberg.org/ebooks/search/?query=${encodedTitle}`,
    description: '70,000+ public domain classic books in ePub and Kindle format',
    iconName: 'book-open',
    badge: 'Public Domain',
    isDirect: false,
    accentColor: 'from-emerald-600 to-teal-700',
  })

  // 5. Standard Ebooks
  readOptions.push({
    id: 'standard_ebooks',
    name: 'Standard Ebooks',
    category: 'read',
    url: `https://standardebooks.org/ebooks?query=${encodedTitle}`,
    description: 'Beautifully formatted, typography-curated free editions',
    iconName: 'sparkles',
    badge: 'Curated Free',
    isDirect: false,
    accentColor: 'from-cyan-600 to-blue-700',
  })

  // 6. Libby by OverDrive (Public Libraries)
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

  // 3. Barnes & Noble
  const bnQuery = cleanIsbnValue || baseQuery
  buyOptions.push({
    id: 'barnes_and_noble',
    name: 'Barnes & Noble',
    category: 'buy',
    url: `https://www.barnesandnoble.com/s/${encodeURIComponent(bnQuery)}`,
    description: 'NOOK ebooks, signed copies, hardcover & paperback',
    iconName: 'shopping-bag',
    badge: 'Store',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-emerald-700 to-emerald-900',
  })

  // 4. Google Play Books
  buyOptions.push({
    id: 'google_play',
    name: 'Google Play Books',
    category: 'buy',
    url: `https://play.google.com/store/search?q=${encodedQuery}&c=books`,
    description: 'Instant digital reading synced across Android, iOS & Web',
    iconName: 'shopping-bag',
    badge: 'Digital Ebook',
    isDirect: false,
    accentColor: 'from-blue-500 to-indigo-600',
  })

  // 5. Apple Books
  buyOptions.push({
    id: 'apple_books',
    name: 'Apple Books',
    category: 'buy',
    url: `https://books.apple.com/search?term=${encodedQuery}`,
    description: 'Optimized for iPhone, iPad, Mac & Apple ecosystem',
    iconName: 'shopping-bag',
    badge: 'Apple Ebook',
    isDirect: false,
    accentColor: 'from-zinc-600 to-zinc-800',
  })

  // 6. ThriftBooks (Pre-owned & Used)
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

  // 7. Goodreads (Community & editions)
  const goodreadsQuery = cleanIsbnValue || baseQuery
  buyOptions.push({
    id: 'goodreads',
    name: 'Goodreads',
    category: 'buy',
    url: `https://www.goodreads.com/search?q=${encodeURIComponent(goodreadsQuery)}`,
    description: 'Explore community reviews, ratings, editions & quotes',
    iconName: 'globe',
    badge: 'Community',
    isDirect: !!cleanIsbnValue,
    accentColor: 'from-stone-600 to-stone-800',
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
