import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Navbar from '@/components/navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'pending') redirect('/pending')
  if (profile?.status === 'rejected') {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </>
  )
}
