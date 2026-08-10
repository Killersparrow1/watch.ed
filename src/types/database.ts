export type MediaType = 'movie' | 'series'
export type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
export type BadgeType = 'golden' | 'absolute appi' | 'MalamCult' | 'wammale cinema' | null
export type ReactionType = 'like' | 'dislike'

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
  type: 'flatrate' | 'rent' | 'buy' | 'ads'
}

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  instagram_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_admin: boolean
  created_at: string
}

export interface Entry {
  id: string
  user_id: string
  title: string
  type: MediaType
  status: WatchStatus
  rating: number | null
  progress_season: number | null
  progress_episode: string | null
  watch_date: string | null
  notes: string | null
  tmdb_id: number | null
  imdb_id: string | null
  poster_path: string | null
  year: number | null
  genres: string[] | null
  overview: string | null
  tagline: string | null
  cast_crew: string | null
  runtime: number | null
  badge: BadgeType
  custom_poster_url: string | null
  favorite: boolean
  watch_providers: WatchProvider[] | null
  download_url: string | null
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Reaction {
  id: string
  entry_id: string
  visitor_id: string
  reaction: ReactionType
  created_at: string
}

export interface EntryWithReactions extends Entry {
  likes: number
  dislikes: number
  user_reaction: ReactionType | null
}

export interface ImportMapping {
  sourceField: string
  targetField: keyof Entry
  required: boolean
}

export interface List {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface WatchEvent {
  id: string
  entry_id: string
  watch_date: string
  notes: string | null
  rating: number | null
  season_number: number | null
  episode_number: number | null
  episode_title: string | null
  created_at: string
}

export interface WatchGoal {
  id: string
  user_id: string
  year: number
  movie_target: number
  series_target: number
  episode_target: number
  hour_target: number
  created_at: string
  updated_at: string
}

export interface Recommendation {
  id: string
  from_user_id: string
  to_user_id: string
  entry_id: string | null
  tmdb_id: number | null
  title: string
  type: 'movie' | 'series' | null
  poster_path: string | null
  year: number | null
  message: string | null
  read: boolean
  created_at: string
}

export interface ListEntry {
  id: string
  list_id: string
  entry_id: string
  position: number
  notes: string | null
  created_at: string
}

export interface WatchParty {
  id: string
  host_id: string
  title: string
  tmdb_id: number | null
  media_type: 'movie' | 'series' | null
  poster_path: string | null
  year: number | null
  watch_date: string
  notes: string | null
  status: 'planned' | 'watching' | 'completed' | 'cancelled'
  stream_url: string | null
  is_public: boolean
  current_time: number
  is_playing: boolean
  created_at: string
  updated_at: string
}

export interface WatchPartyParticipant {
  id: string
  party_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined' | 'watched'
  created_at: string
}

export interface Comment {
  id: string
  entry_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author: {
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface PosterLink {
  label: string | null
  url: string
}

export interface EntryPoster {
  id: string
  entry_id: string
  image_url: string
  links: PosterLink[]
  position: number
  created_at: string
}

export interface WatchPartyMessage {
  id: string
  party_id: string
  user_id: string
  message: string
  created_at: string
}
