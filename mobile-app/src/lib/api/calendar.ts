/**
 * Calendar API for mobile — uses Supabase directly
 */

import { supabase } from '@/lib/supabase/client'
import { CalendarBlock, CalendarAppointment, BlockType } from '@/lib/types/calendar'

export async function getCalendarBlocks(from: string, to: string): Promise<CalendarBlock[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('calendar_blocks')
    .select('*')
    .eq('user_id', user.id)
    .gte('ends_at', from)
    .lte('starts_at', to)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getCalendarAppointments(from: string, to: string): Promise<CalendarAppointment[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) throw new Error('No org')

  const { data, error } = await supabase
    .from('appointments')
    .select('id, case_id, scheduled_at, address, notes, completed_at, cases(case_number, client_name)')
    .eq('org_id', member.org_id)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .order('scheduled_at', { ascending: true })

  if (error) throw error

  return (data || []).map((a: any) => ({
    id: a.id,
    case_id: a.case_id,
    scheduled_at: a.scheduled_at,
    address: a.address,
    notes: a.notes,
    completed_at: a.completed_at,
    case_number: a.cases?.case_number,
    client_name: a.cases?.client_name,
  }))
}

export async function createCalendarBlock(input: {
  block_type: BlockType
  title?: string
  starts_at: string
  ends_at: string
  notes?: string
}): Promise<CalendarBlock> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) throw new Error('No org')

  const { data, error } = await supabase
    .from('calendar_blocks')
    .insert({
      org_id: member.org_id,
      user_id: user.id,
      block_type: input.block_type,
      title: input.title || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarBlock(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_blocks')
    .delete()
    .eq('id', id)

  if (error) throw error
}
