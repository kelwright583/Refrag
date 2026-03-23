/**
 * Update case status API route handler
 * Now also checks notification_rules and returns a notification_prompt if applicable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['draft','assigned','site_visit','awaiting_quote','reporting','submitted','additional','closed']),
})

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
 * PATCH /api/cases/[id]/status - Update case status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = updateStatusSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const { status } = parseResult.data

    // Get current case status before update
    const { data: currentCase } = await supabase
      .from('cases')
      .select('status')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .single()

    const previousStatus = currentCase?.status || null

    // Update status
    const { data, error } = await supabase
      .from('cases')
      .update({ status })
      .eq('id', caseId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: caseId,
      action: 'CASE_STATUS_CHANGED',
      details: { from: previousStatus, to: status },
    })

    // Check for matching notification rules
    let notification_prompt = null

    // Check per-case override first
    const { data: caseOverride } = await supabase
      .from('case_notification_overrides')
      .select('use_org_defaults, overrides')
      .eq('case_id', caseId)
      .single()

    const transitionKey = `${previousStatus}->${status}`
    const overrideDisabled = caseOverride && !caseOverride.use_org_defaults &&
      caseOverride.overrides?.[transitionKey]?.enabled === false

    if (!overrideDisabled) {
      // Query notification rules: exact match (from_status + to_status) or wildcard (from_status IS NULL)
      const { data: rules } = await supabase
        .from('notification_rules')
        .select('*, template:comms_templates(subject_template, body_template_md)')
        .eq('org_id', orgId)
        .eq('to_status', status)
        .eq('is_enabled', true)
        .or(`from_status.eq.${previousStatus},from_status.is.null`)
        .order('from_status', { ascending: false, nullsFirst: false })
        .limit(1)

      if (rules && rules.length > 0) {
        const rule = rules[0]
        notification_prompt = {
          rule_id: rule.id,
          from_status: rule.from_status,
          to_status: rule.to_status,
          auto_send: rule.auto_send,
          template_id: rule.template_id,
          template_subject: rule.template?.subject_template || null,
          template_body: rule.template?.body_template_md || null,
          default_recipients: rule.default_recipients,
        }
      }
    }

    return NextResponse.json({ ...data, notification_prompt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
