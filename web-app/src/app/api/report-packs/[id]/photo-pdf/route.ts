import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { checkAndDeductPackCredit } from '@/lib/billing/credit-gate'
import PDFDocument from 'pdfkit'
import { formatDateTime } from '@/lib/utils/formatting'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: pack, error: packError } = await supabase
      .from('report_packs')
      .select('*, items:report_pack_items(*)')
      .eq('id', packId)
      .eq('org_id', orgId)
      .single()

    if (packError || !pack) return serverError('Report pack not found', 404)

    // Billing gate — verify credits before generating photo PDF
    if (pack.payment_status !== 'paid') {
      const creditResult = await checkAndDeductPackCredit(orgId)
      if (creditResult.status === 'no_credits') {
        return serverError('No credits remaining. Please purchase more.', 402)
      }
      if (creditResult.status === 'subscription_limit') {
        return serverError('Monthly pack limit reached. Credits required for overage.', 402)
      }
      if (creditResult.status === 'not_active') {
        return serverError('Billing account not active.', 402)
      }

      await supabase
        .from('report_packs')
        .update({ payment_status: 'paid', pack_credits_used: 1 })
        .eq('id', packId)
        .eq('org_id', orgId)
    }

    const { data: orgRecord } = await supabase
      .from('organisations')
      .select('locale')
      .eq('id', orgId)
      .single()
    const orgLocale = orgRecord?.locale || undefined

    const { data: links, error: linksError } = await supabase
      .from('report_evidence_links')
      .select('*, evidence:evidence(*)')
      .eq('assessment_id', pack.assessment_id)
      .eq('org_id', orgId)
      .order('display_order', { ascending: true })

    if (linksError) throw linksError
    if (!links || links.length === 0) {
      return serverError('No evidence photos linked to this assessment', 400)
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const evidence = link.evidence as {
        storage_path: string
        file_name: string
        content_type: string
        media_type: string
        captured_at: string | null
        created_at: string
      } | null

      if (!evidence?.storage_path) continue
      if (!evidence.content_type?.startsWith('image/')) continue

      if (i > 0) doc.addPage()

      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(`Photo ${i + 1} of ${links.length}`, 40, 40, { align: 'right' })

      const sectionLabel = link.report_section || 'General'
      doc
        .fontSize(12)
        .fillColor('#30313A')
        .text(sectionLabel, 40, 60)

      try {
        const { data: fileData } = await supabase.storage
          .from('evidence')
          .download(evidence.storage_path)

        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          const imageBuffer = Buffer.from(arrayBuffer)

          const maxWidth = 515
          const maxHeight = 600
          const yStart = 90

          doc.image(imageBuffer, 40, yStart, {
            fit: [maxWidth, maxHeight],
            align: 'center',
            valign: 'center',
          })

          let captionY = yStart + maxHeight + 15

          if (link.caption) {
            doc
              .fontSize(11)
              .fillColor('#30313A')
              .text(link.caption, 40, captionY, { width: maxWidth })
            captionY += 20
          }

          const timestamp = evidence.captured_at || evidence.created_at
          if (timestamp) {
            doc
              .fontSize(9)
              .fillColor('#888888')
              .text(
                `Captured: ${formatDateTime(timestamp, orgLocale)}`,
                40,
                captionY,
                { width: maxWidth }
              )
          }
        }
      } catch (imgErr) {
        doc
          .fontSize(10)
          .fillColor('#CC0000')
          .text(`Could not load image: ${evidence.file_name}`, 40, 90)
      }
    }

    doc.end()
    const pdfBuffer = await pdfReady

    const storagePath = `report-packs/${orgId}/${packId}/photo_evidence.pdf`
    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    return NextResponse.json({ storage_path: storagePath })
  } catch (err: any) {
    console.error('Photo PDF generation error:', err)
    return serverError(err.message)
  }
}
