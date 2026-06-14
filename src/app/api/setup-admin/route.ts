import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

async function claimAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'An admin already exists. Only existing admins can promote users.' }, { status: 403 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true, status: 'approved' })
    .eq('id', user.id)

  if (error) throw error
}

export async function GET() {
  try {
    const result = await claimAdmin()
    if (result) return result
    return NextResponse.redirect(new URL('/dashboard/admin', 'https://watch-ed.vercel.app'))
  } catch (error) {
    console.error('GET /api/setup-admin error:', error)
    return NextResponse.json({ error: 'Failed to setup admin' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await claimAdmin()
    if (result) return result
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/setup-admin error:', error)
    return NextResponse.json({ error: 'Failed to setup admin' }, { status: 500 })
  }
}
