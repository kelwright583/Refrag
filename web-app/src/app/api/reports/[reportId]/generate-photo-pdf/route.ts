import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getPdfGenerator } from '@/lib/adapters/pdf'
import { buildPhotoPdfHtml } from '@/lib/report/photo-pdf-template'

type Params = { params: Promise<{ reportId: string }> }

/**
 * POST /api/reports/[reportId]/generate-photo-pdf
 *
 * Generates a photo-evidence PDF from all evidence linked to the report
 * via report_evidence_links. Each photo gets its own page with caption,
 * AI classification tag, section label, and timestamp.
 */
export async function POST(_request: NextRequest, { params }: Params) {
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

    const [{ data: evidenceLinks }, { data: caseRow }, { data: org }] =
      await Promise.all([
        supabase
          .from('report_evidence_links')
          .select('*, evidence:evidence(*)')
          .eq('report_id', reportId)
          .eq('org_id', orgId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('cases')
          .select('case_number')
          .eq('id', report.case_id)
          .eq('org_id', orgId)
          .single(),
        supabase
          .from('organisations')
          .select('name, logo_storage_path')
          .eq('id', orgId)
          .single(),
      ])

    const photoLinks = (evidenceLinks ?? []).filter((link: any) => {
      const ev = link.evidence
      return ev?.media_type?.startsWith('image/') || ev?.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    })

    if (photoLinks.length === 0) {
      return serverError('No photo evidence linked to this report', 400)
    }

    const logoBase64 = await fetchLogoBase64(supabase, org?.logo_storage_path)

    const photos = await Promise.all(
      photoLinks.map(async (link: any) => {
        const ev = link.evidence
        if (!ev?.storage_path) return null

        const imageBase64 = await fetchImageBase64(supabase, ev.storage_path)
        if (!imageBase64) return null

        return {
          url: imageBase64,
          caption: link.caption ?? ev.file_name ?? undefined,
          classification: ev.ai_classification ?? undefined,
          sectionLabel: link.section_key ?? undefined,
          timestamp: ev.created_at
            ? new Date(ev.created_at).toLocaleString('en-ZA')
            : undefined,
        }
      }),
    )

    const validPhotos = photos.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    )

    if (validPhotos.length === 0) {
      return serverError('Could not load any photo evidence', 400)
    }

    const caseNumber = caseRow?.case_number ?? report.case_id.slice(0, 8)

    const html = buildPhotoPdfHtml({
      orgName: org?.name ?? 'Organisation',
      orgLogo: logoBase64 ?? undefined,
      caseNumber,
      photos: validPhotos,
    })

    const generator = await getPdfGenerator()
    const pdfBuffer = await generator.generatePdf(html)

    const version = report.version ?? 1
    const storagePath = `reports/org/${orgId}/case/${report.case_id}/photos-v${version}.pdf`

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
      action: 'PHOTO_PDF_GENERATED',
      details: {
        report_id: reportId,
        storage_path: storagePath,
        photo_count: validPhotos.length,
      },
    })

    return NextResponse.json({
      url: signedUrlData?.signedUrl ?? null,
      storagePath,
    })
  } catch (err: any) {
    console.error('[generate-photo-pdf]', err)
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
  } catch {
    // non-fatal
  }
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
