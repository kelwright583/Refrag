/**
 * Case mandates API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AssignMandateInput } from '@/lib/types/mandate'

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
 * GET /api/cases/[caseId]/mandates - Get mandates for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('case_mandates')
      .select(`
        *,
        mandate:mandates(*)
      `)
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const result = (data || []).map((item: any) => ({
      ...item,
      mandate: item.mandate,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/mandates - Assign mandate to case
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const { mandate_id } = await request.json()

    // Assign mandate
    const { error: assignError } = await supabase
      .from('case_mandates')
      .insert({
        org_id: orgId,
        case_id: params.id,
        mandate_id,
      })

    if (assignError) {
      // If already assigned, that's okay
      if (assignError.code !== '23505') {
        throw assignError
      }
    }

    // Get all requirements for this mandate
    const { data: requirements, error: reqError } = await supabase
      .from('mandate_requirements')
      .select('*')
      .eq('mandate_id', mandate_id)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (reqError) throw reqError

    // Create requirement_checks for each requirement
    if (requirements && requirements.length > 0) {
      const checksToInsert = requirements.map((req: any) => ({
        org_id: orgId,
        case_id: params.id,
        mandate_requirement_id: req.id,
        status: 'missing' as const,
      }))

      await supabase.from('requirement_checks').upsert(checksToInsert, {
        onConflict: 'case_id,mandate_requirement_id',
        ignoreDuplicates: false,
      })
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'MANDATE_ASSIGNED',
      details: { mandate_id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
