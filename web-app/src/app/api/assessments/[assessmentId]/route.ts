import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { updateMotorAssessmentSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/**
 * GET /api/assessments/[assessmentId]
 * Returns the full assessment with all related data
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    // Fetch all related data in parallel
    const [
      { data: assessment, error: assessmentError },
      { data: vehicleDetails },
      { data: tyreDetails },
      { data: preExistingDamages },
      { data: vehicleValues },
      { data: repairAssessment },
      { data: repairLineItems },
      { data: partsAssessment },
      { data: claimFinancials },
      { data: assessmentDocuments },
      { data: reportEvidenceLinks },
    ] = await Promise.all([
      supabase.from('motor_assessments').select('*').eq('id', assessmentId).eq('org_id', orgId).single(),
      supabase.from('vehicle_details').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
      supabase.from('tyre_details').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).order('position'),
      supabase.from('pre_existing_damages').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).order('created_at'),
      supabase.from('vehicle_values').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
      supabase.from('repair_assessments').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
      supabase.from('repair_line_items').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).order('order_index'),
      supabase.from('parts_assessments').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
      supabase.from('claim_financials').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
      supabase.from('assessment_documents').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).order('created_at'),
      supabase.from('report_evidence_links').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).order('report_section').order('display_order'),
    ])

    if (assessmentError) {
      if (assessmentError.code === 'PGRST116') return serverError('Assessment not found', 404)
      throw assessmentError
    }

    return NextResponse.json({
      ...assessment,
      vehicle_details: vehicleDetails ?? null,
      tyre_details: tyreDetails ?? [],
      pre_existing_damages: preExistingDamages ?? [],
      vehicle_values: vehicleValues ?? null,
      repair_assessment: repairAssessment ?? null,
      repair_line_items: repairLineItems ?? [],
      parts_assessment: partsAssessment ?? null,
      claim_financials: claimFinancials ?? null,
      assessment_documents: assessmentDocuments ?? [],
      report_evidence_links: reportEvidenceLinks ?? [],
    })
  } catch (err: any) {
    return serverError(err.message)
  }
}

/**
 * PATCH /api/assessments/[assessmentId]
 * Update assessment fields (instruction, parties, outcome, status)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()
    const parsed = updateMotorAssessmentSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    // Prevent editing a submitted assessment unless explicitly unlocking
    const { data: existing } = await supabase
      .from('motor_assessments')
      .select('status, case_id')
      .eq('id', assessmentId)
      .eq('org_id', orgId)
      .single()

    if (!existing) return serverError('Assessment not found', 404)

    if (existing.status === 'submitted' && parsed.data.status !== 'ready') {
      return serverError('Submitted assessment cannot be edited. Unlock first.', 403)
    }

    // If marking ready, create a version snapshot
    if (parsed.data.status === 'ready') {
      const { data: fullAssessment } = await supabase
        .from('motor_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single()

      const { count: versionCount } = await supabase
        .from('report_versions')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId)

      await supabase.from('report_versions').insert({
        assessment_id: assessmentId,
        org_id: orgId,
        created_by: user.id,
        version_number: (versionCount ?? 0) + 1,
        snapshot_data: fullAssessment ?? {},
      })
    }

    const { data, error: dbError } = await supabase
      .from('motor_assessments')
      .update(parsed.data)
      .eq('id', assessmentId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: existing.case_id,
      action: 'ASSESSMENT_UPDATED',
      details: { assessment_id: assessmentId, changes: Object.keys(parsed.data) },
    })

    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/**
 * DELETE /api/assessments/[assessmentId]
 * Delete a draft assessment (submitted assessments cannot be deleted)
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const { data: existing } = await supabase
      .from('motor_assessments')
      .select('status, case_id')
      .eq('id', assessmentId)
      .eq('org_id', orgId)
      .single()

    if (!existing) return serverError('Assessment not found', 404)
    if (existing.status === 'submitted') return serverError('Submitted assessments cannot be deleted', 403)

    const { error: dbError } = await supabase
      .from('motor_assessments')
      .delete()
      .eq('id', assessmentId)
      .eq('org_id', orgId)

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: existing.case_id,
      action: 'ASSESSMENT_DELETED',
      details: { assessment_id: assessmentId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
