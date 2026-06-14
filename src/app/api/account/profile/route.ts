import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bio, avatar_url, instagram_url } = await request.json()

    if (bio !== null && (typeof bio !== 'string' || bio.length > 200)) {
      return NextResponse.json({ error: 'Bio must be under 200 characters' }, { status: 400 })
    }

    if (avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 })
    }

    if (instagram_url !== null && typeof instagram_url !== 'string') {
      return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (bio !== undefined) updates.bio = bio || null
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null
    if (instagram_url !== undefined) updates.instagram_url = instagram_url || null

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/account/profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
