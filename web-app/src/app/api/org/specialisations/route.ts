/**
 * Organisation specialisations API
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

/**
 * GET - get current specialisations
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('organisations')
      .select('specialisations')
      .eq('id', orgId)
      .single()

    if (error) throw error
    return NextResponse.json({ specialisations: data?.specialisations || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH - update specialisations
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const body = await request.json()

    if (!Array.isArray(body.specialisations)) {
      return NextResponse.json({ error: 'specialisations must be an array' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('organisations')
      .update({ specialisations: body.specialisations })
      .eq('id', orgId)
      .select('specialisations')
      .single()

    if (error) throw error

    // Audit log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_log').insert({
        org_id: orgId,
        actor_user_id: user.id,
        action: 'ORG_SPECIALISATIONS_UPDATED',
        details: { specialisations: body.specialisations },
      })
    }

    return NextResponse.json({ specialisations: data?.specialisations || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
