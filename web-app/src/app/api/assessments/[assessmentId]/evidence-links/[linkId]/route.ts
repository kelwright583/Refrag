import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

type Params = { params: Promise<{ assessmentId: string; linkId: string }> }

/** DELETE /api/assessments/[assessmentId]/evidence-links/[linkId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { assessmentId, linkId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbError } = await supabase
      .from('report_evidence_links')
      .delete()
      .eq('id', linkId)
      .eq('assessment_id', assessmentId)
      .eq('org_id', orgId)

    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
