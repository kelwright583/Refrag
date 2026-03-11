/**
 * Calendar block types
 */

export type BlockType = 'personal' | 'travel' | 'admin' | 'leave' | 'other'

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  personal: 'Personal',
  travel: 'Travel',
  admin: 'Admin',
  leave: 'Leave',
  other: 'Other',
}

export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  personal: 'bg-blue-100 text-blue-800 border-blue-200',
  travel: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-amber-100 text-amber-800 border-amber-200',
  leave: 'bg-red-100 text-red-800 border-red-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
}

export interface CalendarBlock {
  id: string
  org_id: string
  user_id: string
  block_type: BlockType
  title: string | null
  starts_at: string
  ends_at: string
  is_recurring: boolean
  recurrence_rule: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateCalendarBlockInput {
  block_type: BlockType
  title?: string
  starts_at: string
  ends_at: string
  notes?: string
}

export interface UpdateCalendarBlockInput extends Partial<CreateCalendarBlockInput> {}

/**
 * Appointment (from existing appointments table) presented on calendar
 */
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

/**
 * Union type for calendar events
 */
export type CalendarEvent =
  | { type: 'appointment'; data: CalendarAppointment }
  | { type: 'block'; data: CalendarBlock }
