import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entry_id')
    if (!entryId) {
      return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data: rawComments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const userIds = [...new Set((rawComments || []).map(c => c.user_id))]
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const comments = (rawComments || []).map(c => ({
      ...c,
      author: profileMap.get(c.user_id) || { username: 'unknown', display_name: null, avatar_url: null },
    }))

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('GET /api/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entry_id, content } = await request.json()
    if (!entry_id || !content?.trim()) {
      return NextResponse.json({ error: 'entry_id and content are required' }, { status: 400 })
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment too long (max 1000 characters)' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: entry } = await serviceClient
      .from('entries')
      .select('id, user_id, title')
      .eq('id', entry_id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (entry.user_id !== user.id) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', entry.user_id)
        .maybeSingle()

      if (!follow) {
        return NextResponse.json({ error: 'You must follow this user to comment' }, { status: 403 })
      }
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({ entry_id, user_id: user.id, content: content.trim() })
      .select()
      .single()

    if (insertError) throw insertError

    const { data: commenterProfile } = await serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    const name = commenterProfile?.display_name || commenterProfile?.username || 'Someone'

    if (entry.user_id !== user.id) {
      const msg = `${name} commented on your review of ${entry.title}`
      await serviceClient.from('notifications').insert({
        user_id: entry.user_id,
        type: 'comment',
        message: msg,
        link: `/${commenterProfile?.username || ''}/${entry_id}`,
      }).maybeSingle()
      sendPushNotification(entry.user_id, 'New comment', msg, `/${commenterProfile?.username || ''}/${entry_id}`)
    }

    const commentWithAuthor = {
      ...comment,
      author: {
        username: commenterProfile?.username || 'unknown',
        display_name: commenterProfile?.display_name || null,
        avatar_url: commenterProfile?.avatar_url || null,
      },
    }

    return NextResponse.json({ comment: commentWithAuthor }, { status: 201 })
  } catch (error) {
    console.error('POST /api/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')
    if (!commentId) {
      return NextResponse.json({ error: 'Comment id is required' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    const { data: comment } = await serviceClient
      .from('comments')
      .select('id, user_id, entry_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const { data: entry } = await serviceClient
      .from('entries')
      .select('user_id')
      .eq('id', comment.entry_id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (comment.user_id !== user.id && entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 })
    }

    const { error: deleteError } = await serviceClient
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
