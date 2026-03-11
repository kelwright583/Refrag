import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createReportEvidenceLinkSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/** GET /api/assessments/[assessmentId]/evidence-links */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbError } = await supabase
      .from('report_evidence_links')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('org_id', orgId)
      .order('report_section')
      .order('display_order')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** POST /api/assessments/[assessmentId]/evidence-links */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = createReportEvidenceLinkSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('report_evidence_links')
      .upsert(
        { ...parsed.data, assessment_id: assessmentId, org_id: orgId },
        { onConflict: 'assessment_id,evidence_id,report_section' }
      )
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
