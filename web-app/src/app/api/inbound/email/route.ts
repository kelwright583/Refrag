/**
 * POST /api/inbound/email — webhook for inbound email (Resend/SendGrid/Postmark).
 * Creates inbound_emails row and optionally a draft case.
 * Secured by shared secret in header or query — REQUIRED.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const INBOUND_SECRET = process.env.INBOUND_EMAIL_SECRET

function parseBody(raw: string): { subject?: string; from?: string; body?: string; to?: string } {
  try {
    const j = JSON.parse(raw)
    return {
      subject: j.subject ?? j.Subject ?? j.payload?.subject,
      from: j.from ?? j.From ?? j.payload?.from?.email ?? j.sender,
      body: j.text ?? j.Text ?? j.body ?? j.payload?.text ?? j.html ?? j.Html ?? '',
      to: j.to ?? j.To,
    }
  } catch {
    return {}
  }
}

function parseClaimData(subject: string, body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const combined = `${subject}\n${body}`

  const refMatch = combined.match(/(?:ref|reference|claim)\s*[#:]?\s*([A-Z0-9\-]+)/i)
  if (refMatch) out.insurer_reference = refMatch[1].trim()

  const nameMatch = combined.match(/(?:insured|client|name)\s*[#:]?\s*([^\n,]+)/i)
  if (nameMatch) out.insured_name = nameMatch[1].trim()

  const addrMatch = combined.match(/(?:address|location|site)\s*[#:]?\s*([^\n]+)/i)
  if (addrMatch) out.address = addrMatch[1].trim()

  return out
}

export async function POST(request: NextRequest) {
  try {
    if (!INBOUND_SECRET) {
      return NextResponse.json(
        { error: 'Inbound email webhook is not configured — INBOUND_EMAIL_SECRET is missing' },
        { status: 503 }
      )
    }

    const secret = request.headers.get('x-inbound-secret') || request.nextUrl.searchParams.get('secret')
    if (secret !== INBOUND_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await request.text()
    const { subject = '', from: rawFrom = '', body = '' } = parseBody(raw)
    const parsed = parseClaimData(subject, body)

    const supabase = await createClient()

    const { data: row, error } = await supabase
      .from('inbound_emails')
      .insert({
        raw_subject: subject,
        raw_from: rawFrom,
        raw_body: body.slice(0, 50000),
        parsed_json: parsed,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ id: row.id, status: 'pending' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
