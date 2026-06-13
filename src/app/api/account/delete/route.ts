import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { error: entriesError } = await serviceClient
      .from('entries')
      .delete()
      .eq('user_id', user.id)

    if (entriesError) throw entriesError

    const { error: profileError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) throw profileError

    const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/account/delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
