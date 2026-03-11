import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { upsertPartsAssessmentSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/** PUT /api/assessments/[assessmentId]/parts */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = upsertPartsAssessmentSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('parts_assessments')
      .upsert({ ...parsed.data, assessment_id: assessmentId, org_id: orgId }, { onConflict: 'assessment_id' })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}
