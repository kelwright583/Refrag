/**
 * Case Risk Items API - list and create
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createRiskItemSchema = z.object({
  risk_type: z.string().min(1),
  is_primary: z.boolean().optional(),
  cover_type: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  asset_data: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
})

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('case_risk_items')
      .select('*')
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = createRiskItemSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data

    // If this is primary, unset any existing primary
    if (body.is_primary) {
      await supabase
        .from('case_risk_items')
        .update({ is_primary: false })
        .eq('case_id', caseId)
        .eq('org_id', orgId)
        .eq('is_primary', true)
    }

    const { data, error } = await supabase
      .from('case_risk_items')
      .insert({
        org_id: orgId,
        case_id: caseId,
        is_primary: body.is_primary || false,
        risk_type: body.risk_type,
        cover_type: body.cover_type || null,
        description: body.description || null,
        asset_data: body.asset_data || {},
      })
      .select()
      .single()

    if (error) throw error

    // If primary, update case.primary_risk_item_id
    if (data.is_primary) {
      await supabase
        .from('cases')
        .update({ primary_risk_item_id: data.id })
        .eq('id', caseId)
        .eq('org_id', orgId)
    }

    // Audit log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_log').insert({
        org_id: orgId,
        actor_user_id: user.id,
        case_id: caseId,
        action: 'RISK_ITEM_ADDED',
        details: { risk_item_id: data.id, risk_type: data.risk_type, is_primary: data.is_primary },
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
