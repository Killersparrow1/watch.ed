import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const serviceClient = await createServiceClient()

    const { data: rec } = await serviceClient
      .from('recommendations')
      .select('to_user_id')
      .eq('id', id)
      .single()

    if (!rec || rec.to_user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await serviceClient
      .from('recommendations')
      .update({ read: body.read !== undefined ? body.read : true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ recommendation: data })
  } catch (error) {
    console.error('PATCH /api/recommendations/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { data: rec } = await serviceClient
      .from('recommendations')
      .select('to_user_id, from_user_id')
      .eq('id', id)
      .single()

    if (!rec || (rec.to_user_id !== user.id && rec.from_user_id !== user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await serviceClient
      .from('recommendations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/recommendations/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
