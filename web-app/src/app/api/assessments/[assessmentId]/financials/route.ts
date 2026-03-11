import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { upsertClaimFinancialsSchema } from '@/lib/validation/assessment'
import { computeFullFinancials } from '@/lib/assessment/calculator'

type Params = { params: Promise<{ assessmentId: string }> }

/** PUT /api/assessments/[assessmentId]/financials
 *  Accepts either pre-computed values or triggers a full recalculation from line items.
 *  Pass { recalculate: true } to trigger server-side calculation.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()

    // If recalculate flag is set, compute from stored line items
    if (body.recalculate === true) {
      const [
        { data: assessment },
        { data: lineItems },
        { data: partsAssessment },
        { data: vehicleValues },
        { data: settings },
      ] = await Promise.all([
        supabase.from('motor_assessments').select('outcome').eq('id', assessmentId).eq('org_id', orgId).single(),
        supabase.from('repair_line_items').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId),
        supabase.from('parts_assessments').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
        supabase.from('vehicle_values').select('*').eq('assessment_id', assessmentId).eq('org_id', orgId).maybeSingle(),
        supabase.from('assessment_settings').select('vat_rate').eq('org_id', orgId).maybeSingle(),
      ])

      const computed = computeFullFinancials({
        outcome: assessment?.outcome ?? null,
        lineItems: lineItems ?? [],
        partsAmountExclVat: partsAssessment?.parts_amount_excl_vat ?? 0,
        partsHandlingFeeExclVat: partsAssessment?.parts_handling_fee_excl_vat ?? 0,
        vatRate: settings?.vat_rate ?? 15,
        lessExcess: body.less_excess ?? null,
        excessTba: body.excess_tba ?? true,
        vehicleValues: vehicleValues ?? null,
      })

      const { data, error: dbError } = await supabase
        .from('claim_financials')
        .upsert({ ...computed, assessment_id: assessmentId, org_id: orgId }, { onConflict: 'assessment_id' })
        .select()
        .single()

      if (dbError) throw dbError
      return NextResponse.json(data)
    }

    // Otherwise accept manual values
    const parsed = upsertClaimFinancialsSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('claim_financials')
      .upsert(
        { ...parsed.data, has_manual_override: true, assessment_id: assessmentId, org_id: orgId },
        { onConflict: 'assessment_id' }
      )
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}
