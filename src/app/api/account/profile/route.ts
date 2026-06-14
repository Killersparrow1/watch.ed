import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bio } = await request.json()

    if (bio !== null && (typeof bio !== 'string' || bio.length > 200)) {
      return NextResponse.json({ error: 'Bio must be under 200 characters' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ bio: bio || null })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/account/profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
