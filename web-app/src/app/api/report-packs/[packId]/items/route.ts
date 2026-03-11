import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createReportPackItemSchema } from '@/lib/validation/report-pack'

type Params = { params: Promise<{ packId: string }> }

/** POST /api/report-packs/[packId]/items */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: pack } = await supabase
      .from('report_packs')
      .select('id')
      .eq('id', packId)
      .eq('org_id', orgId)
      .single()

    if (!pack) return serverError('Report pack not found', 404)

    const body = await request.json()
    const parsed = createReportPackItemSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const input = parsed.data

    const { data, error: dbError } = await supabase
      .from('report_pack_items')
      .insert({
        pack_id: packId,
        org_id: orgId,
        item_type: input.item_type,
        assessment_document_id: input.assessment_document_id ?? null,
        evidence_id: input.evidence_id ?? null,
        included: input.included ?? true,
        order_index: input.order_index ?? 0,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
