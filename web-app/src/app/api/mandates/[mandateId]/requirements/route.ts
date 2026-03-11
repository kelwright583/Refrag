/**
 * Mandate requirements API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateMandateRequirementInput } from '@/lib/types/mandate'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * GET /api/mandates/[mandateId]/requirements - Get requirements for a mandate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('mandate_requirements')
      .select('*')
      .eq('mandate_id', params.mandateId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/mandates/[mandateId]/requirements - Create a requirement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const body: Omit<CreateMandateRequirementInput, 'mandate_id'> = await request.json()

    const { data, error } = await supabase
      .from('mandate_requirements')
      .insert({
        ...body,
        mandate_id: params.mandateId,
        org_id: orgId,
        required: body.required ?? false,
        evidence_type: body.evidence_type || 'none',
        order_index: body.order_index ?? 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
