import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { z } from 'zod'

const updateOrgProfileSchema = z.object({
  name: z.string().min(1).optional(),
  legal_name: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

const ALLOWED_FIELDS = [
  'name',
  'legal_name',
  'registration_number',
  'vat_number',
  'contact_email',
  'contact_phone',
  'address',
] as const

/** GET /api/org/profile */
export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbError } = await supabase
      .from('organisations')
      .select(
        'id, name, legal_name, registration_number, vat_number, contact_email, contact_phone, address, logo_url, onboarding_completed_at'
      )
      .eq('id', orgId)
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** PATCH /api/org/profile */
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const raw = await request.json()
    const parseResult = updateOrgProfileSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data
    const update: Record<string, any> = {}

    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        update[key] = body[key] || null
      }
    }

    if (Object.keys(update).length === 0) {
      return serverError('No valid fields to update', 400)
    }

    const { data, error: dbError } = await supabase
      .from('organisations')
      .update(update)
      .eq('id', orgId)
      .select(
        'id, name, legal_name, registration_number, vat_number, contact_email, contact_phone, address, logo_url, onboarding_completed_at'
      )
      .single()

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ORG_PROFILE_UPDATED',
      details: { fields: Object.keys(update) },
    })

    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}
