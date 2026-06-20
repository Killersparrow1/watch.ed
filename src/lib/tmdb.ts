import { Entry, WatchProvider } from '@/types/database'

const TMDB_BASE = 'https://api.themoviedb.org/3'

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) throw new Error('TMDB_API_KEY not configured')

  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`)
  return res.json()
}

export interface TMDBResult {
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string | null
  overview: string | null
  genres: string[]
  media_type: 'movie' | 'series'
  runtime: number | null
  tagline: string | null
  cast_crew: string | null
}

interface TMDBMultiResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview?: string
  genre_ids?: number[]
  media_type: string
}

interface TMDBDetailResult {
  id: number
  title?: string
  name?: string
  tagline?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview?: string
  genres?: { id: number; name: string }[]
  runtime?: number
  episode_run_time?: number[]
}

interface TMDBCreditsResult {
  cast: { name: string }[]
}

export async function searchTMDB(query: string): Promise<TMDBResult[]> {
  const data = await tmdbFetch('/search/multi', { query }) as { results: TMDBMultiResult[] }

  const results = (data.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 10)
    .map((r): TMDBResult => ({
      tmdb_id: r.id,
      title: r.title || r.name || '',
      year: r.release_date
        ? parseInt(r.release_date.slice(0, 4))
        : r.first_air_date
          ? parseInt(r.first_air_date.slice(0, 4))
          : null,
      poster_path: r.poster_path,
      overview: r.overview || null,
      tagline: null,
      cast_crew: null,
      genres: (r.genre_ids || []).map(id => GENRE_NAMES[id] || String(id)),
      media_type: r.media_type === 'movie' ? 'movie' : 'series',
      runtime: null,
    }))

  return results
}

export async function getTMDBDetails(
  tmdbId: number,
  type: 'movie' | 'series'
): Promise<TMDBResult & { genres: string[] }> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const data = await tmdbFetch(endpoint) as TMDBDetailResult

  const [creditsData] = await Promise.all([
    tmdbFetch(`${endpoint}/credits`).catch(() => ({ cast: [] as { name: string }[] })),
  ])

  const credits = creditsData as TMDBCreditsResult
  const topCast = (credits.cast || []).slice(0, 3).map(c => c.name).join(', ')

  return {
    tmdb_id: data.id,
    title: data.title || data.name || '',
    year: data.release_date
      ? parseInt(data.release_date.slice(0, 4))
      : data.first_air_date
        ? parseInt(data.first_air_date.slice(0, 4))
        : null,
    poster_path: data.poster_path,
    overview: data.overview || null,
    tagline: data.tagline || null,
    cast_crew: topCast || null,
    genres: (data.genres || []).map((g) => g.name),
    media_type: type,
    runtime: type === 'movie' ? data.runtime || null : (data.episode_run_time?.[0] || null),
  }
}

export function getPosterUrl(path: string | null, size: 'w92' | 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | null {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function getEntryPosterUrl(entry: Entry, size: 'w92' | 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | null {
  if (entry.custom_poster_url) return entry.custom_poster_url
  return getPosterUrl(entry.poster_path, size)
}

export async function getExternalIds(tmdbId: number, type: 'movie' | 'series'): Promise<{ imdb_id: string | null }> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/external_ids` : `/tv/${tmdbId}/external_ids`
  try {
    const data = await tmdbFetch(endpoint) as { imdb_id: string | null }
    return { imdb_id: data.imdb_id || null }
  } catch {
    return { imdb_id: null }
  }
}

export async function findByIMDbId(imdbId: string): Promise<TMDBResult | null> {
  const data = await tmdbFetch(`/find/${imdbId}`, { external_source: 'imdb_id' }) as {
    movie_results: TMDBMultiResult[]
    tv_results: TMDBMultiResult[]
  }

  const allResults = [
    ...(data.movie_results || []).map(r => ({ ...r, media_type: 'movie' })),
    ...(data.tv_results || []).map(r => ({ ...r, media_type: 'tv' })),
  ]

  if (allResults.length === 0) return null

  const r = allResults[0]
  const mediaType = r.media_type === 'movie' ? 'movie' : 'series' as 'movie' | 'series'

  try {
    return await getTMDBDetails(r.id, mediaType)
  } catch {
    return {
      tmdb_id: r.id,
      title: r.title || r.name || '',
      year: r.release_date
        ? parseInt(r.release_date.slice(0, 4))
        : r.first_air_date
          ? parseInt(r.first_air_date.slice(0, 4))
          : null,
      poster_path: r.poster_path,
      overview: r.overview || null,
      tagline: null,
      cast_crew: null,
      genres: (r.genre_ids || []).map(id => GENRE_NAMES[id] || String(id)),
      media_type: mediaType,
      runtime: null,
    }
  }
}

export async function searchBestMatch(
  title: string,
  year: number | null,
  mediaType: 'movie' | 'series'
): Promise<TMDBResult | null> {
  const endpoint = mediaType === 'movie' ? '/search/movie' : '/search/tv'
  const params: Record<string, string> = { query: title }
  if (year) {
    params[mediaType === 'movie' ? 'year' : 'first_air_date_year'] = String(year)
  }

  const data = await tmdbFetch(endpoint, params) as { results: TMDBMultiResult[] }
  const results = data.results || []

  if (results.length === 0) return null

  const exact = results.find((r) => {
    const t = (r.title || r.name || '').toLowerCase()
    return t === title.toLowerCase()
  }) || results[0]

  return {
    tmdb_id: exact.id,
    title: exact.title || exact.name || '',
    year: exact.release_date
      ? parseInt(exact.release_date.slice(0, 4))
      : exact.first_air_date
        ? parseInt(exact.first_air_date.slice(0, 4))
        : null,
    poster_path: exact.poster_path,
    overview: exact.overview || null,
    tagline: null,
    cast_crew: null,
    genres: [],
    media_type: mediaType,
    runtime: null,
  }
}

interface TMDBWatchProviderData {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

interface TMDBWatchProvidersResponse {
  id: number
  results: Record<string, {
    link?: string
    flatrate?: TMDBWatchProviderData[]
    rent?: TMDBWatchProviderData[]
    buy?: TMDBWatchProviderData[]
    ads?: TMDBWatchProviderData[]
  }>
}

export async function getWatchProviders(
  tmdbId: number,
  type: 'movie' | 'series',
  region: string = 'US'
): Promise<WatchProvider[]> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/watch/providers` : `/tv/${tmdbId}/watch/providers`
  try {
    const data = await tmdbFetch(endpoint) as TMDBWatchProvidersResponse
    const regionData = data.results?.[region]
    if (!regionData) return []

    const providers: WatchProvider[] = []
    const seen = new Set<number>()

    const addIfNew = (items: TMDBWatchProviderData[] | undefined, type: WatchProvider['type']) => {
      if (!items) return
      for (const item of items) {
        if (!seen.has(item.provider_id)) {
          seen.add(item.provider_id)
          providers.push({
            provider_id: item.provider_id,
            provider_name: item.provider_name,
            logo_path: item.logo_path,
            type,
          })
        }
      }
    }

    addIfNew(regionData.flatrate, 'flatrate')
    addIfNew(regionData.ads, 'ads')
    addIfNew(regionData.rent, 'rent')
    addIfNew(regionData.buy, 'buy')

    return providers
  } catch (e) {
    console.warn('getWatchProviders failed:', e)
    return []
  }
}

export async function searchBestMatchMulti(title: string, year: number | null): Promise<TMDBResult | null> {
  const data = await tmdbFetch('/search/multi', { query: title }) as { results: TMDBMultiResult[] }
  const results = (data.results || [])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')

  if (results.length === 0) return null

  const r = results[0]
  return {
    tmdb_id: r.id,
    title: r.title || r.name || '',
    year: r.release_date
      ? parseInt(r.release_date.slice(0, 4))
      : r.first_air_date
        ? parseInt(r.first_air_date.slice(0, 4))
        : null,
    poster_path: r.poster_path,
    overview: r.overview || null,
    tagline: null,
    cast_crew: null,
    genres: [],
    media_type: r.media_type === 'movie' ? 'movie' : 'series',
    runtime: null,
  }
}
