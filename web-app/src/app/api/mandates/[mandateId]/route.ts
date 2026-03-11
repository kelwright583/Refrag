/**
 * Mandate API route handler (single mandate)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
 * GET /api/mandates/[mandateId] - Get mandate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('mandates')
      .select('*')
      .eq('id', params.mandateId)
      .eq('org_id', orgId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/mandates/[mandateId] - Update mandate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const updates = await request.json()

    const { data, error } = await supabase
      .from('mandates')
      .update(updates)
      .eq('id', params.mandateId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/mandates/[mandateId] - Delete mandate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { mandateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { error } = await supabase
      .from('mandates')
      .delete()
      .eq('id', params.mandateId)
      .eq('org_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
