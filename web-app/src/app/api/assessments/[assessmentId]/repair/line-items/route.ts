import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createRepairLineItemSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/** POST /api/assessments/[assessmentId]/repair/line-items */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = createRepairLineItemSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    // Get or create the repair_assessment first
    let { data: repairAssessment } = await supabase
      .from('repair_assessments')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!repairAssessment) {
      const { data: newRA, error: raError } = await supabase
        .from('repair_assessments')
        .insert({ assessment_id: assessmentId, org_id: orgId })
        .select()
        .single()
      if (raError || !newRA) throw raError ?? new Error('Failed to create repair assessment')
      repairAssessment = newRA
    }

    // Auto-assign order_index if not provided
    let orderIndex = parsed.data.order_index
    if (orderIndex === undefined) {
      const { count } = await supabase
        .from('repair_line_items')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId)
      orderIndex = count ?? 0
    }

    const { data, error: dbError } = await supabase
      .from('repair_line_items')
      .insert({
        ...parsed.data,
        order_index: orderIndex,
        assessment_id: assessmentId,
        repair_assessment_id: repairAssessment!.id,
        org_id: orgId,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
