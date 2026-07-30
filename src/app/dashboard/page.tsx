import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()

  const [profileResult, entriesResult] = await Promise.all([
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
      .limit(30),
  ])

  const profile = profileResult.data
  const initialEntries = entriesResult.data || []

  return (
    <DashboardClient
      initialEntries={initialEntries}
      profileUsername={profile?.username || ''}
      profileDisplayName={profile?.display_name || ''}
      profileAvatarUrl={profile?.avatar_url || null}
    />
  )
}
