/**
 * Cases API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/api/server-utils'
import { createCaseSchema } from '@/lib/validation/case'
import { Case } from '@/lib/types/case'
import { trackServerEvent } from '@/lib/events'

/**
 * Get user's organization ID
 */
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
 * GET /api/cases - Get all cases
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases - Create a new case
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const rawBody = await request.json()
    const parsed = createCaseSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data

    // Fetch org slug for case number generation
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('slug')
      .eq('id', orgId)
      .single()

    if (orgError) throw orgError

    // Generate case number: RF-ORG-YEAR-SEQ (sequential)
    const { data: seqResult, error: seqError } = await supabase.rpc('get_next_case_number', {
      p_org_id: orgId,
      p_org_slug: org.slug,
    })
    const case_number = seqError
      ? `${org.slug.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      : seqResult

    const { data, error } = await supabase
      .from('cases')
      .insert({
        client_id: body.client_id || null,
        client_name: body.client_name,
        insurer_name: body.insurer_name || null,
        broker_name: body.broker_name || null,
        claim_reference: body.claim_reference || null,
        insurer_reference: body.insurer_reference || null,
        loss_date: body.loss_date || null,
        location: body.location || null,
        org_id: orgId,
        created_by: user.id,
        case_number,
        status: body.status || 'draft',
        priority: body.priority || 'normal',
        vertical: body.vertical || null,
      })
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: data.id,
      action: 'CASE_CREATED',
      details: { case_number: data.case_number },
    })

    trackServerEvent('case_created', {
      case_id: data.id,
      case_number: data.case_number,
      status: data.status,
    }, { orgId, userId: user.id })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
