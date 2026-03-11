import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { updateRepairLineItemSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string; lineItemId: string }> }

/** PATCH /api/assessments/[assessmentId]/repair/line-items/[lineItemId] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId, lineItemId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = updateRepairLineItemSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('repair_line_items')
      .update(parsed.data)
      .eq('id', lineItemId)
      .eq('assessment_id', assessmentId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** DELETE /api/assessments/[assessmentId]/repair/line-items/[lineItemId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { assessmentId, lineItemId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbError } = await supabase
      .from('repair_line_items')
      .delete()
      .eq('id', lineItemId)
      .eq('assessment_id', assessmentId)
      .eq('org_id', orgId)

    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
