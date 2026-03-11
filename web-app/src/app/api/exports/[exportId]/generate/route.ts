/**
 * Generate PDF for export
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * POST /api/exports/[exportId]/generate - Generate PDF for export
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)

    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .select('*, case:cases(*), report:reports(*, sections:report_sections(*))')
      .eq('id', params.exportId)
      .eq('org_id', orgId)
      .single()

    if (exportError || !exportRecord) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    // Get evidence for the case
    const { data: evidence, error: evidenceError } = await supabase
      .from('evidence')
      .select('*, tags:evidence_tags(tag)')
      .eq('case_id', exportRecord.case_id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (evidenceError) throw evidenceError

    // Get org for logo
    const { data: org } = await supabase
      .from('organisations')
      .select('logo_storage_path, name')
      .eq('id', orgId)
      .single()

    // Generate PDF
    const pdfBuffer = await generateAssessorPackPDF(
      exportRecord.case,
      exportRecord.report,
      evidence || [],
      org?.logo_storage_path ? { supabase, orgId, logoPath: org.logo_storage_path } : undefined
    )

    // Upload PDF to Supabase Storage
    const fileName = `export-${exportRecord.id}.pdf`
    const storagePath = `exports/${orgId}/${exportRecord.case_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('evidence') // Using evidence bucket, could create separate exports bucket
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Update export record with storage path
    const { data: updatedExport, error: updateError } = await supabase
      .from('exports')
      .update({
        storage_path: storagePath,
        meta: {
          generated_at: new Date().toISOString(),
          evidence_count: evidence?.length || 0,
        },
      })
      .eq('id', params.exportId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: exportRecord.case_id,
      action: 'EXPORT_GENERATED',
      details: {
        export_id: params.exportId,
        storage_path: storagePath,
      },
    })

    return NextResponse.json(updatedExport)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Generate Assessor Pack PDF
 */
async function generateAssessorPackPDF(
  caseData: any,
  reportData: any,
  evidence: any[],
  logoOptions?: { supabase: any; orgId: string; logoPath: string }
): Promise<Buffer> {
  let logoBuffer: Buffer | null = null
  if (logoOptions?.logoPath) {
    try {
      // logo_storage_path format: "orgs/{orgId}/logo.png" in evidence or org-assets bucket
      const { data } = await logoOptions.supabase.storage
        .from('evidence') // or org-assets; create org-assets bucket for logos
        .download(logoOptions.logoPath)
      if (data) logoBuffer = Buffer.from(await data.arrayBuffer())
    } catch {
      try {
        const { data } = await logoOptions.supabase.storage
          .from('org-assets')
          .download(logoOptions.logoPath)
        if (data) logoBuffer = Buffer.from(await data.arrayBuffer())
      } catch {
        // Logo bucket or path may not exist yet
      }
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header with logo if available
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 50, { width: 80, height: 40 })
      } catch {
        // Fallback if image parsing fails
      }
      doc.moveDown(3)
    }

    doc.fontSize(20).font('Helvetica-Bold').text('Assessor Pack', { align: 'center' })
    doc.moveDown()

    // Case Information
    doc.fontSize(16).font('Helvetica-Bold').text('Case Information', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica')
    doc.text(`Case Number: ${caseData.case_number}`)
    doc.text(`Client Name: ${caseData.client_name}`)
    if (caseData.insurer_name) doc.text(`Insurer: ${caseData.insurer_name}`)
    if (caseData.broker_name) doc.text(`Broker: ${caseData.broker_name}`)
    if (caseData.claim_reference) doc.text(`Claim Reference: ${caseData.claim_reference}`)
    if (caseData.loss_date) doc.text(`Loss Date: ${new Date(caseData.loss_date).toLocaleDateString()}`)
    if (caseData.location) doc.text(`Location: ${caseData.location}`)
    doc.moveDown()

    // Report Content
    if (reportData) {
      doc.fontSize(16).font('Helvetica-Bold').text('Report', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(14).font('Helvetica-Bold').text(reportData.title)
      if (reportData.summary) {
        doc.moveDown(0.5)
        doc.fontSize(12).font('Helvetica').text(reportData.summary)
      }
      doc.moveDown()

      // Report Sections
      if (reportData.sections && reportData.sections.length > 0) {
        const sortedSections = [...reportData.sections].sort(
          (a: any, b: any) => a.order_index - b.order_index
        )

        for (const section of sortedSections) {
          doc.fontSize(14).font('Helvetica-Bold').text(section.heading, { underline: true })
          doc.moveDown(0.5)
          doc.fontSize(11).font('Helvetica').text(section.body_md || '(No content)', {
            align: 'left',
          })
          doc.moveDown()
        }
      }
    }

    // Evidence Attachments List
    doc.addPage()
    doc.fontSize(16).font('Helvetica-Bold').text('Evidence Attachments', { underline: true })
    doc.moveDown()

    if (evidence && evidence.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text(`Total Evidence Items: ${evidence.length}`)
      doc.moveDown(0.5)

      for (let i = 0; i < evidence.length; i++) {
        const item = evidence[i]
        const tags = item.tags?.map((t: any) => t.tag).join(', ') || 'No tags'

        doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${item.file_name}`)
        doc.fontSize(10).font('Helvetica')
        doc.text(`   Type: ${item.media_type}`)
        doc.text(`   Size: ${formatFileSize(item.file_size)}`)
        doc.text(`   Tags: ${tags}`)
        if (item.notes) doc.text(`   Notes: ${item.notes}`)
        if (item.captured_at) {
          doc.text(`   Captured: ${new Date(item.captured_at).toLocaleString()}`)
        }
        doc.moveDown(0.5)
      }
    } else {
      doc.fontSize(11).font('Helvetica-Italic').text('No evidence attached')
    }

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      `Generated on ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    )

    doc.end()
  })
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
