import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getPdfGenerator } from '@/lib/adapters/pdf'
import { buildReportHtml, mdToHtml } from '@/lib/report/html-template'

type Params = { params: Promise<{ reportId: string }> }

/**
 * POST /api/reports/[reportId]/generate-pdf
 *
 * Server-side PDF generation via Playwright.
 * Fetches report + case + assessment + org stationery, renders branded HTML,
 * converts to PDF, stores in Supabase Storage, returns a signed URL.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { reportId } = await params
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    const { data: report, error: rErr } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('org_id', orgId)
      .single()

    if (rErr || !report) return serverError('Report not found', 404)

    const [
      { data: sections },
      { data: caseRow },
      { data: assessment },
      { data: org },
    ] = await Promise.all([
      supabase
        .from('report_sections')
        .select('*')
        .eq('report_id', reportId)
        .eq('org_id', orgId)
        .order('order_index', { ascending: true }),
      supabase
        .from('cases')
        .select('*, client:clients(name)')
        .eq('id', report.case_id)
        .eq('org_id', orgId)
        .single(),
      report.assessment_id
        ? supabase
            .from('assessments')
            .select('*')
            .eq('id', report.assessment_id)
            .eq('org_id', orgId)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('organisations')
        .select(
          'name, logo_storage_path, stationery_primary_colour, stationery_accent_colour, stationery_text_colour, disclaimer_text, locale, currency_code',
        )
        .eq('id', orgId)
        .single(),
    ])

    if (!caseRow) return serverError('Case not found', 404)

    const logoBase64 = await fetchLogoBase64(supabase, org?.logo_storage_path)

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
      caseNumber: caseRow.case_number ?? caseRow.id?.slice(0, 8) ?? '',
      caseDate: formatDate(caseRow.created_at, org?.locale),
      assessorName: assessment?.assessor_name ?? user.email ?? '',
      clientName: (caseRow as any).client?.name ?? '',
      sections: htmlSections,
      financialSummary: financialSummary && Object.keys(financialSummary).length > 0
        ? financialSummary
        : undefined,
      disclaimerText: org?.disclaimer_text ?? undefined,
    })

    const generator = await getPdfGenerator()
    const pdfBuffer = await generator.generatePdf(html)

    const version = report.version ?? 1
    const storagePath = `reports/org/${orgId}/case/${report.case_id}/report-v${version}.pdf`

    const { error: uploadErr } = await supabase.storage
      .from('evidence')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    const { data: signedUrlData } = await supabase.storage
      .from('evidence')
      .createSignedUrl(storagePath, 3600)

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.case_id,
      action: 'REPORT_PDF_GENERATED',
      details: { report_id: reportId, storage_path: storagePath, version },
    })

    return NextResponse.json({
      url: signedUrlData?.signedUrl ?? null,
      storagePath,
    })
  } catch (err: any) {
    console.error('[generate-pdf]', err)
    return serverError(err.message)
  }
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
      const contentType = resp.headers.get('content-type') ?? 'image/png'
      return `data:${contentType};base64,${buf.toString('base64')}`
    }

    for (const bucket of ['org-assets', 'evidence']) {
      const { data } = await supabase.storage.from(bucket).download(logoPath)
      if (data) {
        const buf = Buffer.from(await data.arrayBuffer())
        const ext = logoPath.split('.').pop()?.toLowerCase() ?? 'png'
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
        return `data:${mime};base64,${buf.toString('base64')}`
      }
    }
  } catch {
    // non-fatal
  }
  return null
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
