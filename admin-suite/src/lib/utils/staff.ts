/**
 * Staff verification utilities
 */

import { createClient } from '@/lib/supabase/server'

export async function isStaff(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return !error && !!data
}

export async function getStaffRole(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('staff_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  return error ? null : data?.role || null
}
