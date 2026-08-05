import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { AiError } from '@/lib/ai'

export interface AiCaller {
  userId: string
  isAdmin: boolean
}

export async function getAiCaller(): Promise<AiCaller> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AiError('unauthorized', 'Not signed in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return { userId: user.id, isAdmin: profile?.is_admin || false }
}

export async function requireOwner(ownerUserId: string, caller?: AiCaller): Promise<AiCaller> {
  const c = caller || await getAiCaller()
  if (!c.isAdmin && c.userId !== ownerUserId) {
    throw new AiError('forbidden', 'Not the owner')
  }
  return c
}

const DEFAULT_DAILY_LIMIT = 20
const MIN_INTERVAL_MS = 5000

export async function enforceAiLimit(caller: AiCaller): Promise<void> {
  if (caller.isAdmin) return

  const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT || String(DEFAULT_DAILY_LIMIT))
  const serviceClient = await createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: row } = await serviceClient
    .from('ai_usage')
    .select('count, last_called_at')
    .eq('user_id', caller.userId)
    .eq('usage_date', today)
    .maybeSingle()

  if (row && row.count >= dailyLimit) {
    throw new AiError('quota', 'Daily AI limit reached')
  }

  if (row?.last_called_at) {
    const elapsed = Date.now() - new Date(row.last_called_at).getTime()
    if (elapsed < MIN_INTERVAL_MS) {
      throw new AiError('quota', 'AI is warming up — try again in a few seconds')
    }
  }

  await serviceClient
    .from('ai_usage')
    .upsert(
      {
        user_id: caller.userId,
        usage_date: today,
        count: (row?.count || 0) + 1,
        last_called_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,usage_date' }
    )
}

export async function getAiCache(key: string): Promise<string | null> {
  const serviceClient = await createServiceClient()
  const { data } = await serviceClient
    .from('ai_cache')
    .select('result')
    .eq('cache_key', key)
    .maybeSingle()
  return data?.result || null
}

export async function setAiCache(key: string, result: string): Promise<void> {
  const serviceClient = await createServiceClient()
  await serviceClient
    .from('ai_cache')
    .upsert({ cache_key: key, result }, { onConflict: 'cache_key' })
}

export function cacheKeyFor(...parts: (string | number | null | undefined)[]): string {
  return parts.map(p => String(p ?? '')).join('|')
}