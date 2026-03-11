/**
 * Resend email utility — all outbound email goes through here
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notifications@refrag.co.za'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

/**
 * Send an email via Resend.
 * Returns the Resend message ID on success, or throws on failure.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return data?.id || ''
}

/**
 * Convert markdown-style text to basic HTML for email.
 * Supports line breaks, bold, and basic formatting.
 */
export function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Line breaks (double newline = paragraph, single = br)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #30313A; line-height: 1.6;"><p>${html}</p></div>`
}
