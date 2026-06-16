'use client'

import { useState, useCallback } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'

interface Props {
  followingId: string
  initialFollowing: boolean
  onFollowChange?: (following: boolean) => void
}

export default function FollowButton({ followingId, initialFollowing, onFollowChange }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(async () => {
    setLoading(true)
    const prev = following
    setFollowing(!following)
    onFollowChange?.(!following)

    const res = await fetch('/api/follow', {
      method: following ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: followingId }),
    })

    if (!res.ok) {
      setFollowing(prev)
      onFollowChange?.(prev)
    }
    setLoading(false)
  }, [following, followingId, onFollowChange])

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-sm transition-colors ${
        following
          ? 'bg-accent-light text-accent border border-accent/30 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
          : 'bg-accent text-white hover:bg-accent-hover'
      }`}
    >
      {loading ? (
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : following ? (
        <UserCheck className="w-3.5 h-3.5" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
