import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { updateAssessmentSettingsSchema } from '@/lib/validation/assessment'

/** GET /api/settings/assessment */
export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data } = await supabase
      .from('assessment_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    return NextResponse.json(data ?? null)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** PUT /api/settings/assessment */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()
    const parsed = updateAssessmentSettingsSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('assessment_settings')
      .upsert({ ...parsed.data, org_id: orgId }, { onConflict: 'org_id' })
      .select()
      .single()

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ASSESSMENT_SETTINGS_UPDATED',
      details: { fields: Object.keys(parsed.data) },
    })

    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}
