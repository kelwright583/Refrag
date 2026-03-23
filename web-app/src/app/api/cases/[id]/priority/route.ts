/**
 * Update case priority API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CasePriority } from '@/lib/types/case'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

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
 * PATCH /api/cases/[id]/priority - Update case priority
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
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as any
    const { priority } = body

    const { data, error } = await supabase
      .from('cases')
      .update({ priority })
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
      action: 'CASE_PRIORITY_CHANGED',
      details: { priority },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
