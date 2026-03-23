/**
 * Communications log API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateCommsLogInput } from '@/lib/types/comms'
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
 * GET /api/cases/[caseId]/comms - Get comms log for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('comms_log')
      .select('*')
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch user emails separately (Supabase doesn't allow direct joins with auth.users)
    const userIds = [...new Set((data || []).map((item: any) => item.sent_by))]
    const userEmails: Record<string, string> = {}

    // Get current user's email
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser && userIds.includes(currentUser.id)) {
      userEmails[currentUser.id] = currentUser.email || ''
    }

    // Transform the data to match our type
    const result = (data || []).map((item: any) => ({
      ...item,
      sent_by_user: userEmails[item.sent_by]
        ? {
            id: item.sent_by,
            email: userEmails[item.sent_by],
          }
        : undefined,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/comms - Create a comms log entry
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
    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as unknown as CreateCommsLogInput

    const { data, error } = await supabase
      .from('comms_log')
      .insert({
        org_id: orgId,
        case_id: params.id,
        sent_by: user.id,
        channel: body.channel,
        to_recipients: body.to_recipients || null,
        subject: body.subject || null,
        body_md: body.body_md,
      })
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'COMMS_LOG_ENTRY_CREATED',
      details: {
        comms_log_id: data.id,
        channel: body.channel,
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
