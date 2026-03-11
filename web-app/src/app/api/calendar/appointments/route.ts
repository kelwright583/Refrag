/**
 * Calendar appointments API — list appointments in date range (from existing appointments table)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organization found')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { orgId } = await getAuth(supabase)
    const from = request.nextUrl.searchParams.get('from') || new Date().toISOString()
    const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 30 * 86400000).toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select('id, case_id, scheduled_at, address, notes, completed_at, cases(case_number, client_name)')
      .eq('org_id', orgId)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .order('scheduled_at', { ascending: true })

    if (error) throw error

    // Flatten the joined case data
    const appointments = (data || []).map((a: any) => ({
      id: a.id,
      case_id: a.case_id,
      scheduled_at: a.scheduled_at,
      address: a.address,
      notes: a.notes,
      completed_at: a.completed_at,
      case_number: a.cases?.case_number,
      client_name: a.cases?.client_name,
    }))

    return NextResponse.json(appointments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
