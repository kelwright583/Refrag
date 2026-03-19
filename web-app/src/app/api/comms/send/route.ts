import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { sendEmail, markdownToHtml } from '@/lib/email/resend'
import {
  EMAIL_TEMPLATES,
  resolveTemplatePlaceholders,
} from '@/lib/comms/email-templates'
import { formatDate } from '@/lib/utils/formatting'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return serverError(
        'Email sending requires RESEND_API_KEY configuration. Set it in your .env.local file.',
        503
      )
    }

    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error!

    const body = await request.json()
    const {
      to,
      subject,
      template_id,
      case_id,
      assessment_id,
      body_html,
      attachments,
    } = body as {
      to: string
      subject: string
      template_id?: string
      case_id: string
      assessment_id?: string
      body_html?: string
      attachments?: string[]
    }

    if (!to || !case_id) {
      return serverError('Missing required fields: to, case_id', 400)
    }

    let resolvedSubject = subject || ''
    let resolvedBodyHtml = body_html || ''

    if (template_id) {
      const template = EMAIL_TEMPLATES.find((t) => t.id === template_id)
      if (!template) return serverError('Template not found', 404)

      const { data: caseData } = await supabase
        .from('cases')
        .select('case_number, client_name, insurer_name, broker_name, claim_reference, loss_date, location')
        .eq('id', case_id)
        .eq('org_id', orgId)
        .single()

      let assessmentOutcome = ''
      if (assessment_id) {
        const { data: assessment } = await supabase
          .from('motor_assessments')
          .select('outcome')
          .eq('id', assessment_id)
          .single()
        assessmentOutcome = assessment?.outcome || ''
      }

      const { data: orgRecord } = await supabase
        .from('organisations')
        .select('locale')
        .eq('id', orgId)
        .single()
      const orgLocale = orgRecord?.locale || undefined

      const placeholders: Record<string, string> = {
        CaseNumber: caseData?.case_number || '',
        ClientName: caseData?.client_name || '',
        InsurerName: caseData?.insurer_name || '',
        BrokerName: caseData?.broker_name || '',
        ClaimReference: caseData?.claim_reference || '',
        LossDate: caseData?.loss_date
          ? formatDate(caseData.loss_date, orgLocale)
          : '',
        Location: caseData?.location || '',
        Outcome: assessmentOutcome,
      }

      resolvedSubject = resolvedSubject || resolveTemplatePlaceholders(template.subject, placeholders)
      resolvedBodyHtml =
        resolvedBodyHtml || markdownToHtml(resolveTemplatePlaceholders(template.body, placeholders))
    }

    if (!resolvedSubject) {
      return serverError('Subject is required', 400)
    }
    if (!resolvedBodyHtml) {
      return serverError('Email body is required', 400)
    }

    const messageId = await sendEmail({
      to,
      subject: resolvedSubject,
      html: resolvedBodyHtml,
    })

    await supabase.from('comms_log').insert({
      org_id: orgId,
      case_id,
      sent_by: user.id,
      channel: 'email',
      direction: 'outbound',
      to_recipients: to,
      subject: resolvedSubject,
      body_md: resolvedBodyHtml,
    })

    return NextResponse.json({ success: true, message_id: messageId })
  } catch (err: any) {
    console.error('Comms send error:', err)
    return serverError(err.message)
  }
}
