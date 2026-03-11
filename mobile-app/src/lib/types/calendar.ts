/**
 * Calendar types for mobile app
 */

export type BlockType = 'personal' | 'travel' | 'admin' | 'leave' | 'other'

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  personal: 'Personal',
  travel: 'Travel',
  admin: 'Admin',
  leave: 'Leave',
  other: 'Other',
}

export interface CalendarBlock {
  id: string
  org_id: string
  user_id: string
  block_type: BlockType
  title: string | null
  starts_at: string
  ends_at: string
  notes: string | null
  created_at: string
}

export interface CalendarAppointment {
  id: string
  case_id: string
  scheduled_at: string
  address: string | null
  notes: string | null
  completed_at: string | null
  case_number?: string
  client_name?: string
}
