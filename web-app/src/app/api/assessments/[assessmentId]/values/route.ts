import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { upsertVehicleValuesSchema } from '@/lib/validation/assessment'
import { computeMaxRepairValue, computeVehicleTotalValue } from '@/lib/assessment/calculator'

type Params = { params: Promise<{ assessmentId: string }> }

/** PUT /api/assessments/[assessmentId]/values */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = upsertVehicleValuesSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const input = parsed.data

    // Auto-compute derived values unless overridden
    const retailValue = input.retail_value ?? 0
    const extrasValue = input.extras_value ?? 0
    const lessOldDamages = input.less_old_damages ?? 0
    const maxRepairPct = input.max_repair_percentage ?? 75

    const vehicleTotalValue = input.vehicle_total_value
      ?? computeVehicleTotalValue(retailValue, extrasValue, lessOldDamages)

    const maxRepairValue = (input.max_repair_value_override && input.max_repair_value != null)
      ? input.max_repair_value
      : computeMaxRepairValue(retailValue, maxRepairPct)

    const { data, error: dbError } = await supabase
      .from('vehicle_values')
      .upsert(
        {
          ...input,
          vehicle_total_value: vehicleTotalValue,
          max_repair_value: maxRepairValue,
          assessment_id: assessmentId,
          org_id: orgId,
        },
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
