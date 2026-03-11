/**
 * Client Rule API - delete by key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) throw new Error('No organization found for user')
  return orgMember.org_id
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; ruleKey: string }> }
) {
  try {
    const { clientId, ruleKey } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { error } = await supabase
      .from('client_rules')
      .delete()
      .eq('client_id', clientId)
      .eq('rule_key', decodeURIComponent(ruleKey))
      .eq('org_id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
