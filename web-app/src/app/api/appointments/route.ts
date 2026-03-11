/**
 * GET: list appointments for org. POST: create appointment (case_id, scheduled_at, address, notes, assigned_to).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let q = supabase
      .from('appointments')
      .select('*, case:cases(id, case_number, client_name)')
      .eq('org_id', orgId)
      .order('scheduled_at', { ascending: true })

    if (caseId) q = q.eq('case_id', caseId)
    if (from) q = q.gte('scheduled_at', from)
    if (to) q = q.lte('scheduled_at', to)

    const { data, error } = await q.limit(100)
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const orgId = await getUserOrgId(supabase)
    const body = await request.json()
    const { case_id, scheduled_at, address, notes, assigned_to } = body
    if (!case_id || !scheduled_at) return NextResponse.json({ error: 'case_id and scheduled_at required' }, { status: 400 })

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        org_id: orgId,
        case_id,
        scheduled_at: new Date(scheduled_at).toISOString(),
        address: address || null,
        notes: notes || null,
        assigned_to: assigned_to || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
