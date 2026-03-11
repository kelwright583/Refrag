import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { upsertTyreDetailsSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/** PUT /api/assessments/[assessmentId]/tyres
 *  Accepts an array of up to 4 tyre objects and upserts each by (assessment_id, position)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = upsertTyreDetailsSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const rows = parsed.data.map((t) => ({ ...t, assessment_id: assessmentId, org_id: orgId }))

    const { data, error: dbError } = await supabase
      .from('tyre_details')
      .upsert(rows, { onConflict: 'assessment_id,position' })
      .select()

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return serverError(err.message)
  }
}
