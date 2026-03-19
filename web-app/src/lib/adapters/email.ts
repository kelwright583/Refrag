export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
}

export interface EmailAdapter {
  send(options: SendEmailOptions): Promise<{ messageId: string }>
  readonly isDryRun: boolean
}

// ---------------------------------------------------------------------------
// Resend — production email delivery
// ---------------------------------------------------------------------------

export class ResendEmailAdapter implements EmailAdapter {
  readonly isDryRun = false
  private apiKey: string

  constructor() {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      throw new Error('ResendEmailAdapter requires RESEND_API_KEY env var')
    }
    this.apiKey = key
  }

  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { Resend } = await import('resend')
    const resend = new Resend(this.apiKey)

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@refrag.co.za',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === 'string'
            ? Buffer.from(a.content)
            : a.content,
      })),
    })

    if (error) {
      throw new Error(`Resend error: ${error.message}`)
    }

    return { messageId: data?.id ?? 'unknown' }
  }
}

// ---------------------------------------------------------------------------
// DryRun — logs to console, never sends
// ---------------------------------------------------------------------------

export class DryRunEmailAdapter implements EmailAdapter {
  readonly isDryRun = true

  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const id = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.log('[Email DryRun]', {
      messageId: id,
      to: options.to,
      subject: options.subject,
      htmlLength: options.html.length,
      attachments: options.attachments?.length ?? 0,
    })
    return { messageId: id }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getEmailAdapter(): EmailAdapter {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailAdapter()
  }
  console.warn('[Email] RESEND_API_KEY not set — using dry-run adapter.')
  return new DryRunEmailAdapter()
}
