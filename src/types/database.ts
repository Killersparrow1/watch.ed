export type MediaType = 'movie' | 'series'
export type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
export type ReactionType = 'like' | 'dislike'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
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
  progress_episode: number | null
  watch_date: string | null
  notes: string | null
  tmdb_id: number | null
  poster_path: string | null
  year: number | null
  genres: string[] | null
  overview: string | null
  created_at: string
  updated_at: string
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
