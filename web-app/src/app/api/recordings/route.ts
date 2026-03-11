/**
 * GET: list recordings for org, optionally filter by case_id.
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

    let q = supabase
      .from('recordings')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (caseId) q = q.eq('case_id', caseId)
    const { data, error } = await q.limit(100)
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
