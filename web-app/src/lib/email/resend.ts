/**
 * Resend email utility — all outbound email goes through here.
 * Validates API key on first use and provides clear error if missing.
 */

import { Resend } from 'resend'

let _resend: Resend | null = null

function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not configured. Set it in your .env.local file to enable email sending.'
      )
    }
    _resend = new Resend(apiKey)
  }
  return _resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@refrag.co.za'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
}

/**
 * Send an email via Resend.
 * Returns the Resend message ID on success, or throws on failure.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const resend = getResendClient()

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
    attachments: input.attachments,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return data?.id || ''
}

export { markdownToHtml } from '@/lib/utils/markdown'
