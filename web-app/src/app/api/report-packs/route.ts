import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createReportPackSchema } from '@/lib/validation/report-pack'

/** GET /api/report-packs?caseId=xxx */
export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) return serverError('caseId query param required', 400)

    const { data, error: dbError } = await supabase
      .from('report_packs')
      .select('*')
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** POST /api/report-packs */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()
    const parsed = createReportPackSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const input = parsed.data

    const { data: pack, error: packError } = await supabase
      .from('report_packs')
      .insert({
        case_id: input.case_id,
        assessment_id: input.assessment_id,
        org_id: orgId,
        created_by: user.id,
        title: input.title ?? null,
      })
      .select()
      .single()

    if (packError) throw packError

    // Populate items from assessment
    const { data: docs } = await supabase
      .from('assessment_documents')
      .select('id, document_type')
      .eq('assessment_id', input.assessment_id)
      .eq('org_id', orgId)

    const { data: evidenceLinks } = await supabase
      .from('report_evidence_links')
      .select('evidence_id')
      .eq('assessment_id', input.assessment_id)
      .eq('org_id', orgId)

    const itemsToInsert: Array<{
      pack_id: string
      org_id: string
      item_type: string
      assessment_document_id: string | null
      evidence_id: string | null
      included: boolean
      order_index: number
    }> = []

    let orderIndex = 0

    // Always include assessment report (generated)
    itemsToInsert.push({
      pack_id: pack.id,
      org_id: orgId,
      item_type: 'assessment_report',
      assessment_document_id: null,
      evidence_id: null,
      included: true,
      order_index: orderIndex++,
    })

    // MM valuation doc
    const mmDoc = docs?.find((d: { document_type: string }) => d.document_type === 'mm_valuation')
    if (mmDoc) {
      itemsToInsert.push({
        pack_id: pack.id,
        org_id: orgId,
        item_type: 'mm_codes',
        assessment_document_id: mmDoc.id,
        evidence_id: null,
        included: true,
        order_index: orderIndex++,
      })
    }

    // Parts quote doc
    const partsDoc = docs?.find((d: { document_type: string }) => d.document_type === 'parts_quote')
    if (partsDoc) {
      itemsToInsert.push({
        pack_id: pack.id,
        org_id: orgId,
        item_type: 'parts_quote',
        assessment_document_id: partsDoc.id,
        evidence_id: null,
        included: true,
        order_index: orderIndex++,
      })
    }

    // Labour/repair estimate doc
    const labourDoc = docs?.find((d: { document_type: string }) => d.document_type === 'repair_estimate')
    if (labourDoc) {
      itemsToInsert.push({
        pack_id: pack.id,
        org_id: orgId,
        item_type: 'labour_quote',
        assessment_document_id: labourDoc.id,
        evidence_id: null,
        included: true,
        order_index: orderIndex++,
      })
    }

    // Photos (from linked evidence)
    if (evidenceLinks && evidenceLinks.length > 0) {
      itemsToInsert.push({
        pack_id: pack.id,
        org_id: orgId,
        item_type: 'photos',
        assessment_document_id: null,
        evidence_id: evidenceLinks[0].evidence_id,
        included: true,
        order_index: orderIndex++,
      })
    }

    if (itemsToInsert.length > 1) {
      await supabase.from('report_pack_items').insert(itemsToInsert)
    }

    return NextResponse.json(pack, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
