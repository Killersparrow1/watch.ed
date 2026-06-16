export type NotificationType = 'reaction' | 'system'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  message: string
  link: string | null
  read: boolean
  created_at: string
}
