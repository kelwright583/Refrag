import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import PDFDocument from 'pdfkit'
import { formatCurrency, formatDate } from '@/lib/utils/formatting'
import type {
  FullMotorAssessment,
  RepairLineItem,
  OperationType,
} from '@/lib/types/assessment'
import {
  computeLineItemTotal,
  computeRepairTotal,
  computeTotalBetterment,
  computePartsTotal,
  computeClaimTotalExclVat,
  applyVat,
  computeMaxRepairValue,
  computeVehicleTotalValue,
  computeIsUneconomical,
  computeWriteOffSettlement,
} from '@/lib/assessment/calculator'

interface Stationery {
  logo_url?: string | null
  primary_colour?: string | null
  accent_colour?: string | null
  text_colour?: string | null
  name?: string | null
  legal_name?: string | null
  registration_number?: string | null
  vat_number?: string | null
  footer_disclaimer?: string | null
}

const OP_TYPE_LABEL: Record<OperationType, string> = {
  panel: 'Panel',
  mechanical: 'Mech.',
  electrical: 'Elec.',
  paint: 'Paint',
  structural: 'Struct.',
  trim: 'Trim',
  glass: 'Glass',
  other: 'Other',
}

const OUTCOME_LABEL: Record<string, string> = {
  repairable: 'REPAIRABLE',
  write_off: 'WRITE-OFF (UNECONOMICAL TO REPAIR)',
  theft_total: 'THEFT TOTAL',
  partial_theft: 'PARTIAL THEFT',
  rejected: 'CLAIM REJECTED',
  further_investigation: 'FURTHER INVESTIGATION REQUIRED',
}

let _locale: string | undefined
let _currencyCode: string | undefined

function fmtCurrency(amount: number | null | undefined): string {
  return formatCurrency(amount, _locale, _currencyCode)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return formatDate(d, _locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * POST /api/export/generate-pdf
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    const body = await request.json()
    const { assessment_id, include_photos = false, include_documents = false } = body

    if (!assessment_id) return serverError('assessment_id is required', 400)

    // Fetch full assessment data in parallel
    const [
      { data: assessment, error: aErr },
      { data: vehicleDetails },
      { data: tyreDetails },
      { data: preExistingDamages },
      { data: vehicleValues },
      { data: repairAssessment },
      { data: repairLineItems },
      { data: partsAssessment },
      { data: claimFinancials },
      { data: reportEvidenceLinks },
    ] = await Promise.all([
      supabase.from('motor_assessments').select('*').eq('id', assessment_id).eq('org_id', orgId).single(),
      supabase.from('vehicle_details').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).maybeSingle(),
      supabase.from('tyre_details').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).order('position'),
      supabase.from('pre_existing_damages').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).order('created_at'),
      supabase.from('vehicle_values').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).maybeSingle(),
      supabase.from('repair_assessments').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).maybeSingle(),
      supabase.from('repair_line_items').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).order('order_index'),
      supabase.from('parts_assessments').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).maybeSingle(),
      supabase.from('claim_financials').select('*').eq('assessment_id', assessment_id).eq('org_id', orgId).maybeSingle(),
      supabase.from('report_evidence_links').select('*, evidence:evidence(*)').eq('assessment_id', assessment_id).eq('org_id', orgId).order('report_section').order('display_order'),
    ])

    if (aErr || !assessment) return serverError('Assessment not found', 404)

    const fullAssessment: FullMotorAssessment = {
      ...assessment,
      vehicle_details: vehicleDetails ?? null,
      tyre_details: tyreDetails ?? [],
      pre_existing_damages: preExistingDamages ?? [],
      vehicle_values: vehicleValues ?? null,
      repair_assessment: repairAssessment ?? null,
      repair_line_items: (repairLineItems ?? []) as RepairLineItem[],
      parts_assessment: partsAssessment ?? null,
      claim_financials: claimFinancials ?? null,
      assessment_documents: [],
      report_evidence_links: reportEvidenceLinks ?? [],
    }

    // Fetch assessment settings
    const { data: settings } = await supabase
      .from('assessment_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    // Fetch org stationery
    const { data: orgData } = await supabase
      .from('organisations')
      .select('logo_url, primary_colour, accent_colour, text_colour, footer_disclaimer, name, legal_name, registration_number, vat_number, locale, currency_code')
      .eq('id', orgId)
      .single()

    const stationery: Stationery = orgData ?? {}
    _locale = (orgData as any)?.locale || undefined
    _currencyCode = (orgData as any)?.currency_code || undefined

    // Fetch logo buffer if logo_url is a storage path
    let logoBuffer: Buffer | null = null
    if (stationery.logo_url) {
      try {
        if (stationery.logo_url.startsWith('http')) {
          const resp = await fetch(stationery.logo_url)
          if (resp.ok) logoBuffer = Buffer.from(await resp.arrayBuffer())
        } else {
          for (const bucket of ['org-assets', 'evidence']) {
            const { data } = await supabase.storage.from(bucket).download(stationery.logo_url)
            if (data) {
              logoBuffer = Buffer.from(await data.arrayBuffer())
              break
            }
          }
        }
      } catch {
        // Logo fetch is non-fatal
      }
    }

    // Fetch photo evidence if requested
    let photoBuffers: { name: string; buffer: Buffer; caption?: string }[] = []
    if (include_photos && reportEvidenceLinks && reportEvidenceLinks.length > 0) {
      const photoLinks = reportEvidenceLinks.filter(
        (link: any) => link.evidence?.media_type?.startsWith('image/')
      )

      for (const link of photoLinks) {
        try {
          const ev = (link as any).evidence
          if (!ev?.storage_path) continue
          const { data } = await supabase.storage.from('evidence').download(ev.storage_path)
          if (data) {
            photoBuffers.push({
              name: ev.file_name || 'Photo',
              buffer: Buffer.from(await data.arrayBuffer()),
              caption: link.caption || ev.file_name || undefined,
            })
          }
        } catch {
          // Skip failed photo downloads
        }
      }
    }

    // Generate PDF
    const pdfBuffer = await buildAssessmentPdf(
      fullAssessment,
      settings,
      stationery,
      logoBuffer,
      photoBuffers,
    )

    // Upload to Supabase Storage
    const fileName = `assessment-${assessment_id}-${Date.now()}.pdf`
    const storagePath = `exports/${orgId}/${assessment.case_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Create export record
    const { data: exportRecord, error: exportErr } = await supabase
      .from('exports')
      .insert({
        org_id: orgId,
        case_id: assessment.case_id,
        assessment_id: assessment_id,
        export_type: 'assessment_report',
        storage_path: storagePath,
        created_by: user.id,
        meta: {
          assessment_type: titleCase(assessment.assessment_type),
          outcome: assessment.outcome,
          include_photos,
          include_documents,
          photo_count: photoBuffers.length,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (exportErr) throw exportErr

    // Signed download URL
    const { data: signedUrlData } = await supabase.storage
      .from('evidence')
      .createSignedUrl(storagePath, 3600)

    // Audit log
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: assessment.case_id,
      action: 'ASSESSMENT_EXPORT_GENERATED',
      details: {
        export_id: exportRecord.id,
        assessment_id,
        storage_path: storagePath,
      },
    })

    return NextResponse.json({
      export_id: exportRecord.id,
      storage_path: storagePath,
      download_url: signedUrlData?.signedUrl ?? null,
    })
  } catch (err: any) {
    return serverError(err.message)
  }
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

async function buildAssessmentPdf(
  assessment: FullMotorAssessment,
  settings: any,
  stationery: Stationery,
  logoBuffer: Buffer | null,
  photoBuffers: { name: string; buffer: Buffer; caption?: string }[],
): Promise<Buffer> {
  const primary = stationery.primary_colour || '#8B4513'
  const accent = stationery.accent_colour || '#1A1A2E'
  const textCol = stationery.text_colour || '#1A1A2E'
  const orgName = stationery.name || null
  const orgReg = stationery.registration_number || settings?.company_registration || null
  const orgVat = stationery.vat_number || settings?.vat_registration || null

  const v = assessment.vehicle_details
  const vals = assessment.vehicle_values
  const ra = assessment.repair_assessment
  const pa = assessment.parts_assessment
  const cf = assessment.claim_financials

  const vatRate = settings?.vat_rate ?? 15
  const maxRepairPct = vals?.max_repair_percentage ?? settings?.max_repair_percentage ?? 75

  const repairTotal = computeRepairTotal(assessment.repair_line_items)
  const bettermentTotal = computeTotalBetterment(assessment.repair_line_items)
  const partsTotal = computePartsTotal(
    pa?.parts_amount_excl_vat ?? 0,
    pa?.parts_handling_fee_excl_vat ?? 0,
  )
  const totalExclVat = computeClaimTotalExclVat(repairTotal, partsTotal, bettermentTotal)
  const { vatAmount, totalInclVat } = applyVat(totalExclVat, vatRate)
  const lessExcess = cf?.less_excess ?? null
  const excessTba = cf?.excess_tba ?? true
  const lessSalvage = cf?.less_salvage ?? vals?.salvage_value ?? 0
  const grandTotal = totalInclVat - (lessExcess ?? 0)

  const retailValue = vals?.retail_value ?? 0
  const maxRepairValue = vals?.max_repair_value_override
    ? (vals?.max_repair_value ?? computeMaxRepairValue(retailValue, maxRepairPct))
    : computeMaxRepairValue(retailValue, maxRepairPct)
  const vehicleTotalValue = computeVehicleTotalValue(retailValue, vals?.extras_value ?? 0, vals?.less_old_damages ?? 0)
  const uneconomical = computeIsUneconomical(repairTotal + partsTotal, maxRepairValue)
  const isWriteOff = assessment.outcome === 'write_off' || assessment.outcome === 'theft_total'
  const writeOffSettlement = isWriteOff
    ? computeWriteOffSettlement(vehicleTotalValue, lessSalvage, lessExcess)
    : null
  const withoutPrejudice = settings?.without_prejudice_default ?? true

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      info: {
        Title: `Assessment Report - ${assessment.claim_number || assessment.id.slice(0, 8)}`,
        Author: orgName || 'Refrag',
      },
    })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const PAGE_W = doc.page.width - 100 // usable width with 50px margins

    // ──────────────────────────────────────────────────
    // Helper functions
    // ──────────────────────────────────────────────────

    function sectionHeading(num: string, title: string) {
      doc.moveDown(0.5)
      const y = doc.y
      doc.rect(50, y, PAGE_W, 22).fill(primary)
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
        .text(`${num}. ${title.toUpperCase()}`, 58, y + 5, { width: PAGE_W - 16 })
      doc.fillColor(textCol).font('Helvetica')
      doc.y = y + 30
    }

    function infoRow(label: string, value: string | null | undefined) {
      if (!value) return
      doc.fontSize(9).font('Helvetica').fillColor('#6B6B7E')
        .text(`${label}:  `, { continued: true })
        .fillColor(textCol).font('Helvetica-Bold').text(value)
    }

    function tableHeader(cols: { label: string; width: number; align?: string }[]) {
      const y = doc.y
      doc.rect(50, y, PAGE_W, 18).fill(accent)
      let x = 54
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
      for (const col of cols) {
        const opts: any = { width: col.width }
        if (col.align === 'right') opts.align = 'right'
        else if (col.align === 'center') opts.align = 'center'
        doc.text(col.label, x, y + 4, opts)
        x += col.width
      }
      doc.fillColor(textCol).font('Helvetica')
      doc.y = y + 22
    }

    function tableRow(cols: { value: string; width: number; align?: string }[], bg?: string) {
      const y = doc.y
      if (bg) doc.rect(50, y, PAGE_W, 16).fill(bg)
      let x = 54
      doc.fillColor(textCol).fontSize(8).font('Helvetica')
      for (const col of cols) {
        const opts: any = { width: col.width }
        if (col.align === 'right') opts.align = 'right'
        else if (col.align === 'center') opts.align = 'center'
        doc.text(col.value, x, y + 3, opts)
        x += col.width
      }
      doc.y = y + 16
    }

    function checkPage(needed: number = 80) {
      if (doc.y + needed > doc.page.height - 70) doc.addPage()
    }

    function addFooter() {
      const footerY = doc.page.height - 45
      doc.fontSize(7).font('Helvetica').fillColor('#9CA3AF')
        .text(
          'Powered by Refrag · refrag.app',
          50,
          footerY,
          { align: 'center', width: PAGE_W }
        )
    }

    // ──────────────────────────────────────────────────
    // HEADER
    // ──────────────────────────────────────────────────

    let headerY = 50
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, headerY, { width: 100, height: 50, fit: [100, 50] })
        headerY += 5
      } catch { /* skip bad image */ }
    }

    doc.fontSize(8).font('Helvetica').fillColor('#6B6B7E')
    const rightX = 350
    if (orgName) {
      doc.fontSize(12).font('Helvetica-Bold').fillColor(textCol)
        .text(orgName, rightX, 50, { align: 'right', width: PAGE_W - 300 })
    }
    if (orgReg) {
      doc.fontSize(8).font('Helvetica').fillColor('#6B6B7E')
        .text(`Reg: ${orgReg}`, rightX, doc.y, { align: 'right', width: PAGE_W - 300 })
    }
    if (orgVat) {
      doc.fontSize(8).font('Helvetica').fillColor('#6B6B7E')
        .text(`VAT: ${orgVat}`, rightX, doc.y, { align: 'right', width: PAGE_W - 300 })
    }

    doc.y = Math.max(doc.y, 80)
    doc.moveDown(0.5)

    // Title bar
    const titleY = doc.y
    doc.rect(50, titleY, PAGE_W, 30).fill(primary)
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
      .text('MOTOR VEHICLE ASSESSMENT REPORT', 58, titleY + 8, { width: PAGE_W - 16, align: 'center' })
    doc.y = titleY + 38

    if (withoutPrejudice) {
      doc.fontSize(7).font('Helvetica').fillColor('#6B6B7E')
        .text('WITHOUT PREJUDICE', 50, doc.y, { align: 'center', width: PAGE_W })
    }

    doc.fontSize(8).fillColor('#6B6B7E')
      .text(`Dated: ${fmtDate(assessment.date_assessed || new Date().toISOString())}`, 50, doc.y + 4, { align: 'center', width: PAGE_W })

    if (assessment.sequence_number > 1) {
      doc.fillColor(primary).fontSize(8).font('Helvetica-Bold')
        .text(
          `${assessment.assessment_sequence === 'supplementary' ? 'Supplementary' : 'Re-inspection'} — #${assessment.sequence_number}`,
          50, doc.y + 2, { align: 'center', width: PAGE_W }
        )
    }

    doc.fillColor(textCol).font('Helvetica')
    doc.moveDown(1)

    // Outcome banner
    if (assessment.outcome) {
      checkPage(30)
      const oY = doc.y
      doc.rect(50, oY, PAGE_W, 24).fill(
        assessment.outcome === 'repairable' ? '#16a34a' :
        assessment.outcome.includes('write_off') || assessment.outcome === 'theft_total' ? '#b91c1c' :
        '#ca8a04'
      )
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
        .text(OUTCOME_LABEL[assessment.outcome] ?? assessment.outcome.toUpperCase(), 58, oY + 6, { align: 'center', width: PAGE_W - 16 })
      doc.fillColor(textCol).font('Helvetica')
      doc.y = oY + 32
    }

    // ──────────────────────────────────────────────────
    // 1. INSTRUCTION DETAILS
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('1', 'Instruction Details')
    infoRow('Insurer', assessment.insurer_name)
    infoRow('Insurer Email', assessment.insurer_email)
    infoRow('Claim Number', assessment.claim_number)
    infoRow('Date of Loss', fmtDate(assessment.date_of_loss))
    infoRow('Claims Technician', assessment.claims_technician)
    infoRow('Policy Number', assessment.policy_number)

    // ──────────────────────────────────────────────────
    // 2. INSURED DETAILS
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('2', 'Insured Details')
    infoRow('Insured Name', assessment.insured_name)
    infoRow('Contact Number', assessment.insured_contact)
    infoRow('Policy Number', assessment.policy_number)

    // ──────────────────────────────────────────────────
    // 3. ASSESSOR DETAILS
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('3', 'Assessor Details')
    infoRow('Assessor', assessment.assessor_name)
    infoRow('Contact', assessment.assessor_contact)
    infoRow('Date Assessed', fmtDate(assessment.date_assessed))
    infoRow('Assessment Type', titleCase(assessment.assessment_type))
    infoRow('Assessment Location', assessment.assessment_location)
    infoRow('Vehicle Stripped', assessment.vehicle_stripped ? 'Yes — stripped for inspection' : 'No')

    // ──────────────────────────────────────────────────
    // 4. VEHICLE DESCRIPTION
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('4', 'Vehicle Description')
    infoRow('Make', v?.make)
    infoRow('Model', v?.model)
    infoRow('Year Model', v?.year_model?.toString())
    infoRow('Registration', v?.reg_number)
    infoRow('VIN Number', v?.vin_number)
    infoRow('Engine Number', v?.engine_number)
    infoRow('Mileage', v?.mileage_unknown ? 'Not legible' : (v?.mileage != null ? `${v.mileage.toLocaleString()} km` : null))
    infoRow(v?.identifier_type || 'Identifier Code', v?.identifier_value ?? v?.mm_code)
    infoRow('Transmission', v?.transmission)
    infoRow('Colour', v?.colour)

    // ──────────────────────────────────────────────────
    // 5. VEHICLE CONDITION
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('5', 'Vehicle Condition')
    const conditionItems = [
      ['Windscreen', v?.windscreen],
      ['Wheels', v?.wheels],
      ['Spare Wheel', v?.spare_wheel],
      ['Air Conditioning', v?.air_conditioning],
      ['Radio / Infotainment', v?.radio],
      ['Brakes', v?.brakes],
    ] as [string, string | undefined][]
    for (const [label, value] of conditionItems) {
      infoRow(label, value ? titleCase(value) : null)
    }
    if (v?.vehicle_notes) {
      doc.moveDown(0.3)
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6B6B7E').text(v.vehicle_notes)
      doc.font('Helvetica').fillColor(textCol)
    }

    // ──────────────────────────────────────────────────
    // 6. DAMAGE OVERVIEW
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('6', 'Damage Overview')
    infoRow('Primary Damage Direction', v?.damage_direction ? titleCase(v.damage_direction) : null)
    if (v?.damage_description) {
      doc.moveDown(0.3).fontSize(9).fillColor(textCol).text(v.damage_description)
    }

    // ──────────────────────────────────────────────────
    // 7. PRE-EXISTING DAMAGES
    // ──────────────────────────────────────────────────
    if (assessment.pre_existing_damages.length > 0) {
      checkPage(60)
      sectionHeading('7', 'Pre-Existing Damages')
      const dCols = [
        { label: 'Location', width: 170 },
        { label: 'Severity', width: 120 },
        { label: 'Description', width: PAGE_W - 300 },
      ]
      tableHeader(dCols)
      assessment.pre_existing_damages.forEach((d, i) => {
        checkPage(20)
        tableRow(
          [
            { value: d.location, width: 170 },
            { value: titleCase(d.severity), width: 120 },
            { value: d.description || '—', width: PAGE_W - 300 },
          ],
          i % 2 === 1 ? '#FAFAF8' : undefined,
        )
      })
    }

    // ──────────────────────────────────────────────────
    // 8. TYRE CONDITION
    // ──────────────────────────────────────────────────
    if (assessment.tyre_details.length > 0) {
      checkPage(80)
      sectionHeading('8', 'Tyre Condition')
      const posLabel: Record<string, string> = { RF: 'Right Front', LF: 'Left Front', RR: 'Right Rear', LR: 'Left Rear' }
      const tCols = [
        { label: 'Position', width: 90 },
        { label: 'Make', width: 80 },
        { label: 'Size', width: 80 },
        { label: 'Tread', width: 60 },
        { label: 'Condition', width: 70 },
        { label: 'Comments', width: PAGE_W - 390 },
      ]
      tableHeader(tCols)
      assessment.tyre_details.forEach((t, i) => {
        checkPage(20)
        tableRow(
          [
            { value: posLabel[t.position] || t.position, width: 90 },
            { value: t.make || '—', width: 80 },
            { value: t.size || '—', width: 80 },
            { value: t.tread_mm != null ? `${t.tread_mm} mm` : '—', width: 60 },
            { value: titleCase(t.condition), width: 70 },
            { value: t.comments || '—', width: PAGE_W - 390 },
          ],
          i % 2 === 1 ? '#FAFAF8' : undefined,
        )
      })
    }

    // ──────────────────────────────────────────────────
    // 9. VEHICLE VALUATION
    // ──────────────────────────────────────────────────
    checkPage(100)
    sectionHeading('9', 'Vehicle Valuation')
    infoRow('Valuation Source', vals?.source ? titleCase(vals.source) : null)
    infoRow('Valuation Date', fmtDate(vals?.valuation_date ?? null))
    doc.moveDown(0.3)

    const valuationItems = [
      ['New Price (OTR)', fmtCurrency(vals?.new_price_value)],
      ['Retail Value', fmtCurrency(vals?.retail_value)],
      ['Trade Value', fmtCurrency(vals?.trade_value)],
      ['Market Value', fmtCurrency(vals?.market_value)],
      ['Extras Value', fmtCurrency(vals?.extras_value)],
      ['Less Old Damages', fmtCurrency(vals?.less_old_damages)],
    ]
    for (const [label, value] of valuationItems) {
      infoRow(label, value)
    }
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(textCol)
      .text(`Vehicle Total Value: ${fmtCurrency(vehicleTotalValue)}`)
    doc.text(`Max Repair Threshold (${maxRepairPct}%): ${fmtCurrency(maxRepairValue)}`)
    if (isWriteOff) {
      doc.text(`Salvage Value: ${fmtCurrency(vals?.salvage_value)}`)
    }
    doc.font('Helvetica')

    // ──────────────────────────────────────────────────
    // 10. REPAIRER DETAILS
    // ──────────────────────────────────────────────────
    if (ra) {
      checkPage()
      sectionHeading('10', 'Repairer Details')
      infoRow('Repairer / Workshop', ra.repairer_name)
      infoRow('Contact Number', ra.repairer_contact)
      infoRow('Email', ra.repairer_email)
      infoRow('Approved Panel Repairer', ra.approved_repairer ? 'Yes' : 'No')
      infoRow('Repairer Quoted Amount', ra.quoted_amount != null ? fmtCurrency(ra.quoted_amount) : null)
    }

    // ──────────────────────────────────────────────────
    // 11. REPAIR LINE ITEMS
    // ──────────────────────────────────────────────────
    if (assessment.repair_line_items.length > 0) {
      checkPage(100)
      sectionHeading('11', 'Repair Assessment — Line Items')

      const colW = {
        desc: 150, type: 50, parts: 65, labour: 65,
        paint: 60, other: 55, total: 65, appr: 30,
      }
      const liCols = [
        { label: 'Description', width: colW.desc },
        { label: 'Type', width: colW.type, align: 'center' },
        { label: 'Parts', width: colW.parts, align: 'right' },
        { label: 'Labour', width: colW.labour, align: 'right' },
        { label: 'Paint', width: colW.paint, align: 'right' },
        { label: 'Other', width: colW.other, align: 'right' },
        { label: 'Total', width: colW.total, align: 'right' },
        { label: 'Appr.', width: colW.appr, align: 'center' },
      ]
      tableHeader(liCols)

      for (let i = 0; i < assessment.repair_line_items.length; i++) {
        checkPage(20)
        const item = assessment.repair_line_items[i]
        const total = computeLineItemTotal(item)
        const labour = item.labour_hours * item.labour_rate
        const paint = item.paint_cost + item.paint_materials_cost
        const other = item.strip_assm_cost + item.frame_cost + item.misc_cost

        tableRow(
          [
            { value: item.description, width: colW.desc },
            { value: OP_TYPE_LABEL[item.operation_type], width: colW.type, align: 'center' },
            { value: item.parts_cost > 0 ? fmtCurrency(item.parts_cost) : '—', width: colW.parts, align: 'right' },
            { value: labour > 0 ? fmtCurrency(labour) : '—', width: colW.labour, align: 'right' },
            { value: paint > 0 ? fmtCurrency(paint) : '—', width: colW.paint, align: 'right' },
            { value: other > 0 ? fmtCurrency(other) : '—', width: colW.other, align: 'right' },
            { value: fmtCurrency(total), width: colW.total, align: 'right' },
            { value: item.is_approved ? '✓' : '✗', width: colW.appr, align: 'center' },
          ],
          i % 2 === 1 ? '#FAFAF8' : undefined,
        )
      }

      // Betterment row
      if (bettermentTotal > 0) {
        doc.moveDown(0.2)
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#9a3412')
          .text(`Less: Betterment Deduction — (${fmtCurrency(bettermentTotal)})`, { align: 'right' })
        doc.font('Helvetica').fillColor(textCol)
      }

      // Total row
      const totY = doc.y + 2
      doc.rect(50, totY, PAGE_W, 20).fill(accent)
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
        .text(`Assessed Repair Total (excl. VAT): ${fmtCurrency(repairTotal)}`, 54, totY + 5, { width: PAGE_W - 8, align: 'right' })
      doc.fillColor(textCol).font('Helvetica')
      doc.y = totY + 26

      // Uneconomical warning
      if (uneconomical.isUneconomical) {
        checkPage(30)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#b91c1c')
          .text(
            `UNECONOMICAL TO REPAIR: Repair total (${fmtCurrency(repairTotal + partsTotal)}) exceeds max threshold of ${fmtCurrency(maxRepairValue)} by ${fmtCurrency(uneconomical.exceedsByAmount)} (${uneconomical.exceedsByPercent.toFixed(1)}%).`,
          )
        doc.fillColor(textCol).font('Helvetica')
      }
    }

    // ──────────────────────────────────────────────────
    // 12. PARTS ASSESSMENT
    // ──────────────────────────────────────────────────
    if (pa) {
      checkPage()
      sectionHeading('12', 'Parts Assessment')
      infoRow('Parts Supplier', pa.supplier_name)
      infoRow('Contact', pa.supplier_contact)
      infoRow('Email', pa.supplier_email)
      if (pa.notes_on_parts) {
        doc.moveDown(0.2).fontSize(8).fillColor('#6B6B7E').text(pa.notes_on_parts)
        doc.fillColor(textCol)
      }
      doc.moveDown(0.3)
      infoRow('Parts (excl. VAT)', fmtCurrency(pa.parts_amount_excl_vat))
      infoRow('Handling Fee (excl. VAT)', fmtCurrency(pa.parts_handling_fee_excl_vat))
      doc.fontSize(9).font('Helvetica-Bold').fillColor(textCol)
        .text(`Total Parts (excl. VAT): ${fmtCurrency(partsTotal)}`)
        .text(`Total Parts (incl. VAT): ${fmtCurrency(partsTotal * (1 + vatRate / 100))}`)
      doc.font('Helvetica')
    }

    // ──────────────────────────────────────────────────
    // 13. FINANCIAL SUMMARY
    // ──────────────────────────────────────────────────
    checkPage(120)
    sectionHeading('13', 'Financial Summary')

    function financialRow(label: string, value: string, isTotal = false) {
      checkPage(22)
      const y = doc.y
      if (isTotal) {
        doc.rect(50, y, PAGE_W, 22).fill(accent)
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
          .text(label, 58, y + 5, { width: PAGE_W / 2 })
        doc.text(value, 50, y + 5, { width: PAGE_W - 8, align: 'right' })
        doc.fillColor(textCol).font('Helvetica')
        doc.y = y + 24
      } else {
        doc.rect(50, y, PAGE_W, 18).fill(doc.y % 2 === 0 ? '#FFFFFF' : '#FAFAF8')
        doc.fillColor(textCol).fontSize(9).font('Helvetica')
          .text(label, 58, y + 4, { width: PAGE_W / 2 })
        doc.font('Helvetica-Bold')
          .text(value, 50, y + 4, { width: PAGE_W - 8, align: 'right' })
        doc.font('Helvetica')
        doc.y = y + 20
      }
    }

    if (isWriteOff && writeOffSettlement) {
      financialRow('Vehicle Total Value', fmtCurrency(vehicleTotalValue))
      financialRow('Less: Salvage Value', `(${fmtCurrency(lessSalvage)})`)
      financialRow('Less: Excess', excessTba ? 'TBA' : (lessExcess ? `(${fmtCurrency(lessExcess)})` : '—'))
      financialRow('NET SETTLEMENT', fmtCurrency(writeOffSettlement.netSettlement), true)
    } else {
      financialRow('Repair Labour & Operations (excl. VAT)', fmtCurrency(repairTotal))
      financialRow('Parts incl. Handling (excl. VAT)', fmtCurrency(partsTotal))
      if (bettermentTotal > 0) {
        financialRow('Less: Betterment Deduction', `(${fmtCurrency(bettermentTotal)})`)
      }
      financialRow('Total (excl. VAT)', fmtCurrency(totalExclVat))
      financialRow(`VAT (${vatRate}%)`, fmtCurrency(vatAmount))
      financialRow('Total (incl. VAT)', fmtCurrency(totalInclVat))
      financialRow('Less: Excess', excessTba ? 'TBA' : (lessExcess ? `(${fmtCurrency(lessExcess)})` : '—'))
      financialRow('GRAND TOTAL', fmtCurrency(grandTotal), true)
    }

    // ──────────────────────────────────────────────────
    // 14. ASSESSMENT OUTCOME
    // ──────────────────────────────────────────────────
    checkPage()
    sectionHeading('14', 'Assessment Outcome & Recommendation')
    if (assessment.outcome) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(textCol)
        .text(OUTCOME_LABEL[assessment.outcome] ?? assessment.outcome.toUpperCase())
      doc.font('Helvetica')
    }
    if (assessment.outcome_notes) {
      doc.moveDown(0.3).fontSize(9).fillColor(textCol).text(assessment.outcome_notes)
    }
    if (!assessment.outcome && !assessment.outcome_notes) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6B6B7E').text('Outcome not yet recorded.')
      doc.font('Helvetica').fillColor(textCol)
    }

    // ──────────────────────────────────────────────────
    // 15. ASSESSOR DECLARATION
    // ──────────────────────────────────────────────────
    checkPage(100)
    sectionHeading('15', 'Assessor Declaration')
    doc.fontSize(8).fillColor('#6B6B7E')
      .text(
        'I, the undersigned assessor, hereby certify that the above assessment was conducted to the best of my professional ability and that the findings contained herein represent a true and accurate reflection of the vehicle\'s condition and damage at the time of inspection.',
      )
    doc.moveDown(1)
    const sigY = doc.y
    doc.moveTo(50, sigY).lineTo(250, sigY).stroke('#1A1A2E')
    doc.moveTo(300, sigY).lineTo(500, sigY).stroke('#1A1A2E')
    doc.fontSize(7).fillColor('#6B6B7E')
      .text('Assessor Signature', 50, sigY + 4)
    doc.text('Date', 300, sigY + 4)
    doc.fontSize(9).fillColor(textCol).font('Helvetica-Bold')
      .text(assessment.assessor_name || '______________________', 50, sigY + 14)
    doc.text(fmtDate(assessment.date_assessed), 300, sigY + 14)
    doc.font('Helvetica')

    // ──────────────────────────────────────────────────
    // FOOTER / DISCLAIMER
    // ──────────────────────────────────────────────────
    doc.moveDown(2)
    doc.fontSize(7).fillColor('#6B6B7E')
    const disclaimer = stationery.footer_disclaimer
      || settings?.report_disclaimer
      || `This report has been prepared for the purposes of insurance loss assessment only.${withoutPrejudice ? ' This assessment is issued without prejudice and does not constitute an admission of liability.' : ''} The findings are based on the vehicle's condition at the time of inspection.`
    doc.text(disclaimer, 50, doc.y, { width: PAGE_W })
    doc.moveDown(0.3)
    doc.text(`Assessment Ref: ${assessment.claim_number || assessment.id.slice(0, 8).toUpperCase()}   |   Generated: ${formatDate(new Date(), _locale)}`, { width: PAGE_W, align: 'center' })

    addFooter()

    // ──────────────────────────────────────────────────
    // PHOTO EVIDENCE PAGES
    // ──────────────────────────────────────────────────
    if (photoBuffers.length > 0) {
      doc.addPage()
      const pgTitleY = doc.y
      doc.rect(50, pgTitleY, PAGE_W, 26).fill(primary)
      doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
        .text('PHOTO EVIDENCE', 58, pgTitleY + 6, { width: PAGE_W - 16, align: 'center' })
      doc.fillColor(textCol).font('Helvetica')
      doc.y = pgTitleY + 34

      for (const photo of photoBuffers) {
        checkPage(300)
        try {
          doc.image(photo.buffer, 50, doc.y, {
            fit: [PAGE_W, 400],
            align: 'center',
          })
          doc.moveDown(0.5)
          if (photo.caption) {
            doc.fontSize(8).fillColor('#6B6B7E').text(photo.caption, { align: 'center', width: PAGE_W })
          }
          doc.moveDown(1)
        } catch {
          doc.fontSize(8).fillColor('#6B6B7E').text(`[Could not embed: ${photo.name}]`)
          doc.moveDown(0.5)
        }
      }
      addFooter()
    }

    doc.end()
  })
}
