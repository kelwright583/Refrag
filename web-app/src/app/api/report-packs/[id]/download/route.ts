import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import JSZip from 'jszip'

const ITEM_TYPE_FILE_SUFFIXES: Record<string, string> = {
  assessment_report: 'Assessment_Report',
  mm_codes: 'MM_Codes_Valuation',
  parts_quote: 'Parts_Quotation',
  labour_quote: 'Labour_Estimate',
  photos: 'Photo_Evidence',
  invoice: 'Invoice',
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: pack, error: packError } = await supabase
      .from('report_packs')
      .select('*')
      .eq('id', packId)
      .eq('org_id', orgId)
      .single()

    if (packError || !pack) return serverError('Report pack not found', 404)

    const { data: items, error: itemsError } = await supabase
      .from('report_pack_items')
      .select('*')
      .eq('pack_id', packId)
      .eq('org_id', orgId)
      .eq('included', true)
      .order('order_index', { ascending: true })

    if (itemsError) throw itemsError
    if (!items || items.length === 0) {
      return serverError('No items included in this report pack', 400)
    }

    const { data: caseData } = await supabase
      .from('cases')
      .select('case_number, claim_reference')
      .eq('id', pack.case_id)
      .single()

    const caseRef = caseData?.claim_reference || caseData?.case_number || 'Case'
    const sanitizedRef = caseRef.replace(/[^a-zA-Z0-9_-]/g, '_')

    const zip = new JSZip()

    for (const item of items) {
      const suffix = ITEM_TYPE_FILE_SUFFIXES[item.item_type] || item.item_type
      const fileName = `${sanitizedRef}_${suffix}.pdf`

      let storagePath: string | null = null

      if (item.item_type === 'assessment_report') {
        storagePath = `report-packs/${orgId}/${packId}/assessment_report.pdf`
      } else if (item.item_type === 'photos') {
        storagePath = `report-packs/${orgId}/${packId}/photo_evidence.pdf`
      } else if (item.assessment_document_id) {
        const { data: doc } = await supabase
          .from('assessment_documents')
          .select('evidence_id')
          .eq('id', item.assessment_document_id)
          .single()

        if (doc?.evidence_id) {
          const { data: evidence } = await supabase
            .from('evidence')
            .select('storage_path')
            .eq('id', doc.evidence_id)
            .single()
          storagePath = evidence?.storage_path || null
        }
      }

      if (!storagePath) continue

      try {
        const { data: fileData } = await supabase.storage
          .from('evidence')
          .download(storagePath)

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          zip.file(fileName, arrayBuffer)
        }
      } catch {
        // Skip files that can't be downloaded
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const zipFileName = `${sanitizedRef}_Report_Pack.zip`

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    })
  } catch (err: any) {
    console.error('ZIP download error:', err)
    return serverError(err.message)
  }
}
