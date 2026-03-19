import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

/** GET /api/settings/stationery */
export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbError } = await supabase
      .from('organisations')
      .select(
        'logo_url, primary_colour, accent_colour, text_colour, footer_disclaimer, stationery_updated_at, name, legal_name, registration_number, vat_number'
      )
      .eq('id', orgId)
      .single()

    if (dbError) throw dbError

    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** PATCH /api/settings/stationery */
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()

    const allowed = ['primary_colour', 'accent_colour', 'text_colour', 'footer_disclaimer'] as const
    const update: Record<string, any> = {}

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key.endsWith('_colour')) {
          if (typeof body[key] !== 'string' || !HEX_RE.test(body[key])) {
            return serverError(`${key} must be a valid hex colour (e.g. #C9663D)`, 400)
          }
        }
        update[key] = body[key]
      }
    }

    if (Object.keys(update).length === 0) {
      return serverError('No valid fields to update', 400)
    }

    update.stationery_updated_at = new Date().toISOString()

    const { data, error: dbError } = await supabase
      .from('organisations')
      .update(update)
      .eq('id', orgId)
      .select(
        'logo_url, primary_colour, accent_colour, text_colour, footer_disclaimer, stationery_updated_at, name, legal_name, registration_number, vat_number'
      )
      .single()

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'STATIONERY_UPDATED',
      details: { fields: Object.keys(update) },
    })

    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}
