import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateText, AiError, aiErrorMessage } from '@/lib/ai'
import { getAiCaller, enforceAiLimit } from '@/lib/ai-guard'

export async function GET(request: NextRequest) {
  try {
    const caller = await getAiCaller()
    if (!caller.isAdmin) {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    }

    const serviceClient = await createServiceClient()
    const { data: rawComments, error } = await serviceClient
      .from('comments')
      .select('id, content, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error

    const userIds = [...new Set((rawComments || []).map(c => c.user_id))]
    const { data: profiles } = userIds.length > 0
      ? await serviceClient.from('profiles').select('id, username, display_name').in('id', userIds)
      : { data: [] }
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const comments = (rawComments || []).map(c => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author: profileMap.get(c.user_id) || { username: 'unknown', display_name: null },
    }))

    return NextResponse.json({ comments })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : 500
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('GET /api/ai/moderation error:', error)
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commentId } = body
    if (!commentId || typeof commentId !== 'string') {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 })
    }

    const caller = await getAiCaller()
    if (!caller.isAdmin) {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    }
    await enforceAiLimit(caller)

    const serviceClient = await createServiceClient()

    const { data: comment } = await serviceClient
      .from('comments')
      .select('id, content, user_id, created_at')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const prompt = `You are a comment moderator for a movie-watching community. Assess this comment for toxicity: hate speech, harassment, slurs, personal attacks, or abusive language. Reply with a single line in this exact format: VERDICT: ok|flag REASON: <5-15 words or "none">.
Comment: "${(comment.content || '').slice(0, 1000)}"`

    const result = await generateText(prompt)
    const isFlag = /verdict:\s*flag/i.test(result)
    const reason = result.replace(/^.*verdict:\s*(ok|flag)/i, '').replace(/^[: ]+/, '').slice(0, 200) || 'none'

    return NextResponse.json({ verdict: isFlag ? 'flag' : 'ok', reason })
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === 'unauthorized' ? 401 : error.code === 'forbidden' ? 403 : error.code === 'quota' ? 429 : 502
      return NextResponse.json({ error: aiErrorMessage(error) }, { status })
    }
    console.error('POST /api/ai/moderation error:', error)
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 })
  }
}