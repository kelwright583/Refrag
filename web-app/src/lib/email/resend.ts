/**
 * Resend email utility — all outbound email goes through here.
 * When RESEND_API_KEY is not set, runs in dry-run mode (logs but does not send).
 */

import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@refrag.app'

export interface SendEmailInput {
  to: string | string[]
  toName?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  dryRun: boolean
  error?: string
}

/**
 * Send an email via Resend.
 * Returns a result object — does NOT throw. Callers can inspect result.dryRun and result.error.
 * When RESEND_API_KEY is absent, runs in dry-run mode.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // Dry-run mode — log but do not send
    const toAddrs = Array.isArray(input.to) ? input.to.join(', ') : input.to
    console.log('[Email dry-run]', {
      to: toAddrs,
      subject: input.subject,
      htmlLength: input.html.length,
    })
    return { success: true, dryRun: true }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      attachments: input.attachments,
    })

    if (error) {
      return { success: false, error: error.message, dryRun: false }
    }

    return { success: true, messageId: data?.id, dryRun: false }
  } catch (err) {
    return { success: false, error: String(err), dryRun: false }
  }
}

export { markdownToHtml } from '@/lib/utils/markdown'
