import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { checkAndDeductPackCredit } from '@/lib/billing/credit-gate'
import { getPdfGenerator } from '@/lib/adapters/pdf'
import { buildReportHtml, mdToHtml } from '@/lib/report/html-template'
import { buildPhotoPdfHtml } from '@/lib/report/photo-pdf-template'

type Params = { params: Promise<{ packId: string }> }

const ITEM_TYPE_FILENAME: Record<string, string> = {
  assessment_report: 'Assessment_Report',
  photos: 'Photo_Evidence',
  vehicle_valuation: 'Valuation_Printout',
  repair_estimate: 'Repairer_Quote',
  labour_quote: 'Repairer_Quote',
  parts_quote: 'Parts_Quote',
  invoice: 'Invoice',
}

/**
 * POST /api/report-packs/[packId]/generate-zip
 *
 * Generates a ZIP archive containing all report-pack items:
 *   - Assessment report PDF (server-rendered via Playwright)
 *   - Photo evidence PDF
 *   - Valuation / repairer quote / parts quote / invoice PDFs (from storage)
 *
 * CRITICAL: Deducts a pack credit before generating.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { packId } = await params
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    // ── Load pack ──────────────────────────────────────────────────────────
    const { data: pack, error: packErr } = await supabase
      .from('report_packs')
      .select('*')
      .eq('id', packId)
      .eq('org_id', orgId)
      .single()

    if (packErr || !pack) return serverError('Report pack not found', 404)

    // ── Credit gate — MUST succeed before generating ──────────────────────
    const creditResult = await checkAndDeductPackCredit(orgId, user.id)
    if (creditResult.status !== 'ok') {
      await supabase
        .from('report_packs')
        .update({ status: 'awaiting_payment' })
        .eq('id', packId)

      const message =
        creditResult.status === 'no_credits'
          ? 'No pack credits remaining. Please purchase more credits.'
          : creditResult.status === 'subscription_limit'
            ? 'Monthly pack limit reached. Purchase additional credits to continue.'
            : 'Billing account is not active.'

      return serverError(message, 402)
    }

    // ── Mark in-progress ─────────────────────────────────────────────────
    await supabase
      .from('report_packs')
      .update({ status: 'generating' })
      .eq('id', packId)

    // ── Fetch pack items ─────────────────────────────────────────────────
    const { data: items } = await supabase
      .from('report_pack_items')
      .select('*')
      .or(`pack_id.eq.${packId},report_pack_id.eq.${packId}`)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    const includedItems = (items ?? []).filter((i: any) =>
      i.included !== false && i.is_included !== false,
    )

    // ── Load shared context ──────────────────────────────────────────────
    const { data: caseRow } = await supabase
      .from('cases')
      .select('*, client:clients(name)')
      .eq('id', pack.case_id)
      .eq('org_id', orgId)
      .single()

    const caseRef = sanitiseFilename(
      caseRow?.case_number ?? caseRow?.id?.slice(0, 8) ?? packId.slice(0, 8),
    )

    const { data: org } = await supabase
      .from('organisations')
      .select(
        'name, logo_storage_path, stationery_primary_colour, stationery_accent_colour, stationery_text_colour, disclaimer_text, locale, currency_code',
      )
      .eq('id', orgId)
      .single()

    const logoBase64 = await fetchLogoBase64(supabase, org?.logo_storage_path)
    const generator = await getPdfGenerator()
    const zip = new JSZip()

    // ── Generate each item ───────────────────────────────────────────────
    for (const item of includedItems) {
      try {
        const typeName =
          ITEM_TYPE_FILENAME[item.item_type] ?? item.item_type ?? 'Document'
        const fileName = `${caseRef}_${typeName}.pdf`

        if (item.item_type === 'assessment_report') {
          const buf = await generateReportPdf(
            supabase,
            generator,
            pack,
            caseRow,
            org,
            orgId,
            user,
            logoBase64,
          )
          if (buf) zip.file(fileName, buf)
          continue
        }

        if (item.item_type === 'photos') {
          const buf = await generatePhotoPdf(
            supabase,
            generator,
            pack,
            caseRow,
            org,
            orgId,
            logoBase64,
          )
          if (buf) zip.file(fileName, buf)
          continue
        }

        // Stored documents (valuation, quotes, invoices)
        const buf = await fetchStoredDocument(supabase, item)
        if (buf) zip.file(fileName, buf)
      } catch (itemErr) {
        console.error(`[generate-zip] Failed to add item ${item.id}:`, itemErr)
      }
    }

    // ── Build ZIP buffer ─────────────────────────────────────────────────
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = `packs/org/${orgId}/case/${pack.case_id}/${packId}.zip`

    const { error: uploadErr } = await supabase.storage
      .from('evidence')
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    // ── Update pack record ───────────────────────────────────────────────
    await supabase
      .from('report_packs')
      .update({
        storage_path: zipPath,
        status: 'complete',
        pack_credits_used: 1,
      })
      .eq('id', packId)

    const { data: signedUrlData } = await supabase.storage
      .from('evidence')
      .createSignedUrl(zipPath, 3600)

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: pack.case_id,
      action: 'REPORT_PACK_GENERATED',
      details: {
        pack_id: packId,
        storage_path: zipPath,
        item_count: includedItems.length,
        credit_result: creditResult,
      },
    })

    return NextResponse.json({
      url: signedUrlData?.signedUrl ?? null,
      storagePath: zipPath,
      itemCount: includedItems.length,
    })
  } catch (err: any) {
    console.error('[generate-zip]', err)

    // Best-effort: mark pack as failed
    try {
      const { packId } = await (params as any)
      const { supabase, orgId } = await getAuthContext()
      if (orgId) {
        await supabase
          .from('report_packs')
          .update({ status: 'failed', meta: { error: err.message } })
          .eq('id', packId)
      }
    } catch { /* swallow */ }

    return serverError(err.message)
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function generateReportPdf(
  supabase: any,
  generator: Awaited<ReturnType<typeof getPdfGenerator>>,
  pack: any,
  caseRow: any,
  org: any,
  orgId: string,
  user: any,
  logoBase64: string | null,
): Promise<Buffer | null> {
  const reportId = pack.report_id
  if (!reportId) return null

  const [{ data: report }, { data: sections }, { data: assessment }] =
    await Promise.all([
      supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('org_id', orgId)
        .single(),
      supabase
        .from('report_sections')
        .select('*')
        .eq('report_id', reportId)
        .eq('org_id', orgId)
        .order('order_index', { ascending: true }),
      pack.assessment_id
        ? supabase
            .from('assessments')
            .select('*')
            .eq('id', pack.assessment_id)
            .eq('org_id', orgId)
            .single()
        : Promise.resolve({ data: null }),
    ])

  if (!report) return null

  const htmlSections = (sections ?? []).map((s: any) => ({
    heading: s.heading ?? s.section_key ?? 'Section',
    bodyHtml: s.body_md ? mdToHtml(s.body_md) : (s.body_html ?? s.body ?? ''),
  }))

  const financialSummary = assessment?.financial_summary ?? undefined

  const html = buildReportHtml({
    orgName: org?.name ?? 'Organisation',
    orgLogo: logoBase64 ?? undefined,
    primaryColour: org?.stationery_primary_colour ?? '#1F2933',
    accentColour: org?.stationery_accent_colour ?? '#B4533C',
    textColour: org?.stationery_text_colour ?? '#1F2933',
    caseNumber: caseRow?.case_number ?? '',
    caseDate: formatDate(caseRow?.created_at, org?.locale),
    assessorName: assessment?.assessor_name ?? user.email ?? '',
    clientName: (caseRow as any)?.client?.name ?? '',
    sections: htmlSections,
    financialSummary:
      financialSummary && Object.keys(financialSummary).length > 0
        ? financialSummary
        : undefined,
    disclaimerText: org?.disclaimer_text ?? undefined,
  })

  return generator.generatePdf(html)
}

async function generatePhotoPdf(
  supabase: any,
  generator: Awaited<ReturnType<typeof getPdfGenerator>>,
  pack: any,
  caseRow: any,
  org: any,
  orgId: string,
  logoBase64: string | null,
): Promise<Buffer | null> {
  const reportId = pack.report_id
  if (!reportId) return null

  const { data: evidenceLinks } = await supabase
    .from('report_evidence_links')
    .select('*, evidence:evidence(*)')
    .eq('report_id', reportId)
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })

  const photoLinks = (evidenceLinks ?? []).filter((link: any) => {
    const ev = link.evidence
    return (
      ev?.media_type?.startsWith('image/') ||
      ev?.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    )
  })

  if (photoLinks.length === 0) return null

  const photos = (
    await Promise.all(
      photoLinks.map(async (link: any) => {
        const ev = link.evidence
        if (!ev?.storage_path) return null
        const b64 = await fetchImageBase64(supabase, ev.storage_path)
        if (!b64) return null
        return {
          url: b64,
          caption: link.caption ?? ev.file_name ?? undefined,
          classification: ev.ai_classification ?? undefined,
          sectionLabel: link.section_key ?? undefined,
          timestamp: ev.created_at
            ? new Date(ev.created_at).toLocaleString('en-ZA')
            : undefined,
        }
      }),
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  if (photos.length === 0) return null

  const html = buildPhotoPdfHtml({
    orgName: org?.name ?? 'Organisation',
    orgLogo: logoBase64 ?? undefined,
    caseNumber: caseRow?.case_number ?? '',
    photos,
  })

  return generator.generatePdf(html)
}

async function fetchStoredDocument(
  supabase: any,
  item: any,
): Promise<Buffer | null> {
  // Try intake_documents path first
  if (item.intake_document_id) {
    const { data: doc } = await supabase
      .from('intake_documents')
      .select('storage_path')
      .eq('id', item.intake_document_id)
      .single()
    if (doc?.storage_path) {
      return downloadFromStorage(supabase, doc.storage_path)
    }
  }

  // Try assessment_documents (legacy)
  if (item.assessment_document_id) {
    const { data: doc } = await supabase
      .from('assessment_documents')
      .select('storage_path')
      .eq('id', item.assessment_document_id)
      .single()
    if (doc?.storage_path) {
      return downloadFromStorage(supabase, doc.storage_path)
    }
  }

  // Try evidence record
  if (item.evidence_id) {
    const { data: ev } = await supabase
      .from('evidence')
      .select('storage_path')
      .eq('id', item.evidence_id)
      .single()
    if (ev?.storage_path) {
      return downloadFromStorage(supabase, ev.storage_path)
    }
  }

  return null
}

async function downloadFromStorage(
  supabase: any,
  path: string,
): Promise<Buffer | null> {
  for (const bucket of ['evidence', 'org-assets']) {
    try {
      const { data } = await supabase.storage.from(bucket).download(path)
      if (data) return Buffer.from(await data.arrayBuffer())
    } catch { /* try next bucket */ }
  }
  return null
}

async function fetchLogoBase64(
  supabase: any,
  logoPath: string | null | undefined,
): Promise<string | null> {
  if (!logoPath) return null
  try {
    if (logoPath.startsWith('http')) {
      const resp = await fetch(logoPath)
      if (!resp.ok) return null
      const buf = Buffer.from(await resp.arrayBuffer())
      const ct = resp.headers.get('content-type') ?? 'image/png'
      return `data:${ct};base64,${buf.toString('base64')}`
    }
    for (const bucket of ['org-assets', 'evidence']) {
      const { data } = await supabase.storage.from(bucket).download(logoPath)
      if (data) {
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = logoPath.split('.').pop()?.toLowerCase() ?? 'png'
        const mime =
          ext === 'svg'
            ? 'image/svg+xml'
            : `image/${ext === 'jpg' ? 'jpeg' : ext}`
        return `data:${mime};base64,${buf.toString('base64')}`
      }
    }
  } catch { /* non-fatal */ }
  return null
}

async function fetchImageBase64(
  supabase: any,
  storagePath: string,
): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from('evidence')
      .download(storagePath)
    if (!data) return null
    const buf = Buffer.from(await data.arrayBuffer())
    const ext = storagePath.split('.').pop()?.toLowerCase() ?? 'png'
    const mime =
      ext === 'svg'
        ? 'image/svg+xml'
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function formatDate(iso: string | null, locale?: string): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale ?? 'en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')
}
