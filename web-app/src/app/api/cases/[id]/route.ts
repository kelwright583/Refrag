/**
 * Case API route handler (single case)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateCaseInput, CaseStatus, CasePriority } from '@/lib/types/case'
import { trackServerEvent } from '@/lib/events'
import { z } from 'zod'

const updateCaseSchema = z.object({
  client_name: z.string().min(1).optional(),
  insurer_name: z.string().optional().nullable(),
  broker_name: z.string().optional().nullable(),
  claim_reference: z.string().optional().nullable(),
  loss_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['draft','assigned','site_visit','awaiting_quote','reporting','submitted','additional','closed']).optional(),
  priority: z.enum(['low','normal','high']).optional(),
  vertical: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
}).strict()

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
 * GET /api/cases/[id] - Get case by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/cases/[id] - Update case
 */
export async function PATCH(
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
    const raw = await request.json()
    const parseResult = updateCaseSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const updates = parseResult.data

    const { data, error } = await supabase
      .from('cases')
      .update(updates)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'CASE_UPDATED',
      details: updates,
    })

    if (updates.status) {
      trackServerEvent('case_status_changed', {
        case_id: params.id,
        new_status: updates.status,
      }, { orgId, userId: user.id, vertical: data.vertical })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
