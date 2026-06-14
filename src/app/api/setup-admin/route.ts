import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: true, status: 'approved' })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.redirect(new URL('/dashboard/admin', 'https://watch-ed.vercel.app'))
  } catch (error) {
    console.error('GET /api/setup-admin error:', error)
    return NextResponse.json({ error: 'Failed to setup admin' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: true, status: 'approved' })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/setup-admin error:', error)
    return NextResponse.json({ error: 'Failed to setup admin' }, { status: 500 })
  }
}
