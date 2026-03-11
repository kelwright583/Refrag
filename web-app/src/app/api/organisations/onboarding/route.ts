/**
 * GET: check onboarding status. PATCH: mark onboarding complete.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

export async function GET() {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { data, error } = await supabase
      .from('organisations')
      .select('onboarding_completed_at')
      .eq('id', orgId)
      .single()
    if (error) throw error
    return NextResponse.json({ onboarding_completed_at: data?.onboarding_completed_at ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { error } = await supabase
      .from('organisations')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', orgId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
