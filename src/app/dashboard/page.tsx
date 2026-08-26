import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()

  const [profileResult, entriesResult, booksResult] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single(),
    serviceClient
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('watch_date', { ascending: false, nullsFirst: false })
      .limit(60),
    serviceClient
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const profile = profileResult.data
  const initialEntries = entriesResult.data || []
  const initialBooks = booksResult.data || []

  return (
    <DashboardClient
      initialEntries={initialEntries}
      initialBooks={initialBooks}
      profileUsername={profile?.username || ''}
      profileDisplayName={profile?.display_name || ''}
      profileAvatarUrl={profile?.avatar_url || null}
    />
  )
}
