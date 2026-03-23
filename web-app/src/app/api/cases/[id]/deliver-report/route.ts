/**
 * POST /api/cases/[id]/deliver-report
 * Sends a report download link to a recipient via email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/resend'

const deliverReportSchema = z.object({
  reportPackId: z.string().uuid().optional(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  customMessage: z.string().optional(),
  includeInvoice: z.boolean().default(false),
})

async function getUserAndOrg(supabase: any): Promise<{ userId: string; orgId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
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

  return { userId: user.id as string, orgId: orgMember.org_id as string }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { userId, orgId } = await getUserAndOrg(supabase)

    // Parse and validate body
    const rawBody = await request.json()
    const parseResult = deliverReportSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }
    const body = parseResult.data

    // Fetch the case — RLS ensures org membership
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, case_number, client_name, org_id')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    // Resolve the report download URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    let downloadUrl: string = `${appUrl}/cases/${params.id}/reports`

    if (body.reportPackId) {
      // Fetch the export record to get the storage path
      const { data: exportRecord, error: exportError } = await supabase
        .from('exports')
        .select('id, storage_path, org_id, case_id')
        .eq('id', body.reportPackId)
        .eq('case_id', params.id)
        .eq('org_id', orgId)
        .single()

      if (!exportError && exportRecord?.storage_path) {
        // Service client can generate signed URLs bypassing RLS (7 days = 604800s)
        try {
          const serviceClient = createServiceClient()
          const { data: signedData, error: signedError } = await serviceClient.storage
            .from('exports')
            .createSignedUrl(exportRecord.storage_path as string, 604800)

          if (!signedError && signedData?.signedUrl) {
            downloadUrl = signedData.signedUrl
          }
        } catch {
          // fall back to report page URL
        }
      }
    }

    // Build email HTML
    const customMessageHtml = body.customMessage
      ? `<p style="margin: 16px 0; color: #374151;">${body.customMessage.replace(/\n/g, '<br>')}</p>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Report — Case ${caseData.case_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f7f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f7f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e1db; overflow: hidden;">
          <tr>
            <td style="background-color: #1c1917; padding: 24px 32px;">
              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.01em;">Refrag</p>
              <p style="margin: 4px 0 0; color: #a8a29e; font-size: 13px;">Assessment Report Delivery</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">Dear ${body.recipientName},</p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">
                Please find your assessment report for case <strong style="color: #1c1917;">${caseData.case_number}</strong> available via the link below.
              </p>
              ${customMessageHtml}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}"
                       style="display: inline-block; background-color: #c9663d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                      Download Report
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; word-break: break-all;">
                <a href="${downloadUrl}" style="color: #c9663d; font-size: 13px;">${downloadUrl}</a>
              </p>
              ${body.reportPackId ? '<p style="margin: 0; color: #9ca3af; font-size: 12px;">This link expires in 7 days.</p>' : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9f7f4; border-top: 1px solid #e5e1db; padding: 20px 32px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This email was sent by Refrag on behalf of the assessment organisation. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const textBody = `Dear ${body.recipientName},\n\nPlease find your assessment report for case ${caseData.case_number} available via the link below.\n\n${body.customMessage ? body.customMessage + '\n\n' : ''}Download Report: ${downloadUrl}\n\n${body.reportPackId ? 'This link expires in 7 days.\n\n' : ''}Regards,\nRefrag`

    // Send the email
    const emailResult = await sendEmail({
      to: body.recipientEmail,
      toName: body.recipientName,
      subject: `Assessment Report — Case ${caseData.case_number}`,
      html,
      text: textBody,
    })

    // Log to comms_log (best-effort — table may not exist yet)
    try {
      await supabase.from('comms_log').insert({
        org_id: orgId,
        case_id: params.id,
        actor_user_id: userId,
        event_type: 'report_delivered',
        recipient_email: body.recipientEmail,
        status: emailResult.dryRun ? 'dry_run' : emailResult.success ? 'sent' : 'failed',
        meta: {
          recipient_name: body.recipientName,
          report_pack_id: body.reportPackId || null,
          message_id: emailResult.messageId || null,
          error: emailResult.error || null,
        },
      })
    } catch {
      // ignore — comms_log table may not exist
    }

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Email send failed', dryRun: false },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      dryRun: emailResult.dryRun,
      downloadUrl,
    })
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
