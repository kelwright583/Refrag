import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createMotorAssessmentSchema } from '@/lib/validation/assessment'

/**
 * GET /api/assessments?caseId=xxx
 * List all assessments for a case (ordered by sequence_number)
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) return serverError('caseId query param required', 400)

    const { data, error: dbError } = await supabase
      .from('motor_assessments')
      .select('*')
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .order('sequence_number', { ascending: true })

    if (dbError) throw dbError

    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

/**
 * POST /api/assessments
 * Create a new motor assessment
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()
    const parsed = createMotorAssessmentSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const input = parsed.data

    // Auto-increment sequence_number within the case
    const { count } = await supabase
      .from('motor_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', input.case_id)
      .eq('org_id', orgId)

    const sequenceNumber = (count ?? 0) + 1

    const { data, error: dbError } = await supabase
      .from('motor_assessments')
      .insert({
        ...input,
        org_id: orgId,
        created_by: user.id,
        sequence_number: sequenceNumber,
        assessor_name: input.assessor_name ?? user.email,
        date_assessed: input.date_assessed ?? new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Auto-populate vehicle_details from case risk_items[0].asset_data if it's a motor vehicle
    try {
      const { data: riskItems } = await supabase
        .from('risk_items')
        .select('risk_type, asset_data')
        .eq('case_id', input.case_id)
        .eq('org_id', orgId)
        .eq('is_primary', true)
        .limit(1)
        .single()

      if (riskItems?.risk_type === 'motor_vehicle' && riskItems.asset_data) {
        const asset = riskItems.asset_data as Record<string, unknown>
        await supabase.from('vehicle_details').upsert(
          {
            assessment_id: data.id,
            org_id: orgId,
            make: (asset.make as string) || null,
            model: (asset.model as string) || null,
            year: asset.year ? Number(asset.year) : null,
            registration: (asset.registration as string) || null,
            vin: (asset.vin as string) || null,
            engine_number: (asset.engine_number as string) || null,
          },
          { onConflict: 'assessment_id' }
        )
      }
    } catch {
      // Non-fatal — vehicle_details can be filled manually
    }

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: input.case_id,
      action: 'ASSESSMENT_CREATED',
      details: { assessment_id: data.id, sequence: input.assessment_sequence },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
