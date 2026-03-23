/**
 * Case Notify API — send notification email from a status change
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, markdownToHtml } from '@/lib/email/resend'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

async function getUserOrgId(supabase: any): Promise<{ orgId: string; userId: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organization found for user')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const { orgId, userId } = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data

    const { recipients, recipient_types, subject, body: bodyMd } = body as any

    if (!recipients || !recipients.length) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
    }

    // Send via Resend
    const html = markdownToHtml(bodyMd)
    const messageId = await sendEmail({
      to: recipients,
      subject,
      html,
    })

    // Log in comms_log
    await supabase.from('comms_log').insert({
      org_id: orgId,
      case_id: caseId,
      sent_by: userId,
      channel: 'email',
      to_recipients: recipients.join(', '),
      subject,
      body_md: bodyMd,
    })

    // Audit log
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: userId,
      case_id: caseId,
      action: 'EMAIL_SENT',
      details: {
        message_id: messageId,
        recipient_types,
        recipients,
        subject,
      },
    })

    return NextResponse.json({ success: true, message_id: messageId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
