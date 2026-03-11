/**
 * Calendar API functions (client-side)
 */

import { CalendarBlock, CreateCalendarBlockInput, UpdateCalendarBlockInput, CalendarAppointment } from '@/lib/types/calendar'

export async function getCalendarBlocks(from: string, to: string): Promise<CalendarBlock[]> {
  const params = new URLSearchParams({ from, to })
  const res = await fetch(`/api/calendar/blocks?${params}`)
  if (!res.ok) throw new Error('Failed to fetch calendar blocks')
  return res.json()
}

export async function createCalendarBlock(input: CreateCalendarBlockInput): Promise<CalendarBlock> {
  const res = await fetch('/api/calendar/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create block')
  }
  return res.json()
}

export async function updateCalendarBlock(id: string, input: UpdateCalendarBlockInput): Promise<CalendarBlock> {
  const res = await fetch(`/api/calendar/blocks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update block')
  }
  return res.json()
}

export async function deleteCalendarBlock(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/blocks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete block')
}

export async function getCalendarAppointments(from: string, to: string): Promise<CalendarAppointment[]> {
  const params = new URLSearchParams({ from, to })
  const res = await fetch(`/api/calendar/appointments?${params}`)
  if (!res.ok) throw new Error('Failed to fetch appointments')
  return res.json()
}
