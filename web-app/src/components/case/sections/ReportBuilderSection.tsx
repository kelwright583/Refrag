'use client'

import { useState, useCallback } from 'react'
import { FileEdit, Plus, Loader2, AlertCircle, PenLine, CheckCircle2 } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'
import { useReports, useCreateReport } from '@/hooks/use-reports'
import type { SectionState } from '@/components/report/SectionEditor'
import dynamic from 'next/dynamic'
import { SignaturePad } from '@/components/SignaturePad'

const ReportBuilder = dynamic(() => import('@/components/report/ReportBuilder'), {
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-copper" />
    </div>
  ),
  ssr: false,
})

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function ReportBuilderSection({ caseId, orgSettings }: SectionProps) {
  const { data: caseData, isLoading: caseLoading } = useCase(caseId)
  const { data: reports, isLoading: reportsLoading } = useReports(caseId)
  const createReport = useCreateReport()
  const [creating, setCreating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showSigPad, setShowSigPad] = useState(false)
  const [savedSignature, setSavedSignature] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signerDesignation, setSignerDesignation] = useState('')
  const [sigSaving, setSigSaving] = useState(false)

  const report = reports?.[0] ?? null

  const orgBranding = {
    name: orgSettings?.name ?? 'Organisation',
    logoUrl: orgSettings?.logo_url ?? orgSettings?.logoUrl ?? null,
    primaryColor: orgSettings?.primary_color ?? orgSettings?.primaryColor ?? '#B87333',
  }

  const handleCreateReport = async () => {
    if (!caseData) return
    setCreating(true)
    try {
      await createReport.mutateAsync({
        caseId,
        input: {
          case_id: caseId,
          title: caseData.claim_reference
            ? `${caseData.claim_reference} — Assessment Report`
            : `Case ${caseData.case_number ?? caseId.slice(0, 8)} Report`,
        },
      })
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleSave = useCallback(async (sections: SectionState[], selectedOutcome: string | null) => {
    if (!report) return
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/reports/${report.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections.map((s, idx) => ({
            section_key: s.key,
            heading: s.heading,
            body_md: s.bodyMd,
            order_index: idx,
          })),
          outcome: selectedOutcome,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error ?? 'Failed to save report')
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message)
    }
  }, [report])

  const handleSignatureSave = async (dataUrl: string) => {
    if (!report) return
    setSigSaving(true)
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `sig_${report.id}.png`, { type: 'image/png' })

      const fd = new FormData()
      fd.append('file', file)
      fd.append('report_id', report.id)

      const uploadRes = await fetch('/api/reports/signature', {
        method: 'POST',
        body: fd,
      })

      if (uploadRes.ok) {
        const { signedUrl } = await uploadRes.json()
        setSavedSignature(signedUrl ?? dataUrl)
      } else {
        setSavedSignature(dataUrl)
      }
      setShowSigPad(false)
    } catch {
      setSavedSignature(dataUrl)
      setShowSigPad(false)
    } finally {
      setSigSaving(false)
    }
  }

  if (caseLoading || reportsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex items-center gap-2 p-4 border border-red-200 bg-red-50 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-sm text-red-700">Could not load case data.</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-10 text-center">
        <FileEdit className="w-10 h-10 text-slate/30 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-charcoal mb-1">No report started</h3>
        <p className="text-xs text-slate mb-4">Create a new report to start drafting content for this case.</p>
        <button
          onClick={handleCreateReport}
          disabled={creating || createReport.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium text-sm"
        >
          {(creating || createReport.isPending) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {(creating || createReport.isPending) ? 'Creating...' : 'Create Report'}
        </button>
        {(saveError || createReport.error) && (
          <p className="text-xs text-red-600 mt-2">{saveError ?? (createReport.error as any)?.message}</p>
        )}
      </div>
    )
  }

  // Build initial sections from the report (use-reports useReport hook returns sections via getReport)
  // We'll pass undefined and let ReportBuilder use its defaults with config templates
  const initialSections = undefined

  return (
    <div className="space-y-3">
      {/* Report header info */}
      <div className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-copper" />
          <span className="text-sm font-medium text-charcoal">{report.title}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            v{report.version}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            report.status === 'submitted' ? 'bg-green-100 text-green-700' :
            report.status === 'ready' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
        </div>
        {saveSuccess && (
          <span className="text-xs text-green-600 font-medium">Saved successfully</span>
        )}
        {saveError && (
          <span className="text-xs text-red-600">{saveError}</span>
        )}
      </div>

      <ReportBuilder
        caseData={{
          id: caseData.id,
          case_number: caseData.case_number,
          claim_reference: caseData.claim_reference ?? undefined,
          client_name: caseData.client_name,
          loss_date: caseData.loss_date ?? undefined,
          vertical: (caseData as any).vertical ?? 'general',
        }}
        reportId={report.id}
        orgBranding={orgBranding}
        initialSections={initialSections}
        onSave={handleSave}
      />

      {/* ── Assessor Declaration & Signature ─────────────────────────── */}
      <div className="mt-4 border border-[#D4CFC7] rounded-xl p-4 space-y-4 bg-[#FAFAF8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-copper" aria-hidden="true" />
            <span className="text-sm font-semibold text-charcoal">Assessor Declaration & Signature</span>
          </div>
          {savedSignature && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Signed
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="signer-name" className="block text-xs text-muted mb-1">Full name</label>
            <input
              id="signer-name"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
            />
          </div>
          <div>
            <label htmlFor="signer-designation" className="block text-xs text-muted mb-1">Designation / qualifications</label>
            <input
              id="signer-designation"
              type="text"
              value={signerDesignation}
              onChange={(e) => setSignerDesignation(e.target.value)}
              placeholder="e.g. MIASA, AIIA"
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
            />
          </div>
        </div>

        {savedSignature ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={savedSignature}
              alt="Assessor signature"
              className="h-20 border border-[#D4CFC7] rounded-lg bg-white p-2 object-contain"
            />
            <button
              onClick={() => { setSavedSignature(null); setShowSigPad(true) }}
              aria-label="Re-sign the declaration"
              className="text-xs text-copper underline"
            >
              Re-sign
            </button>
          </div>
        ) : showSigPad ? (
          <div className="space-y-2">
            <SignaturePad
              label="Sign in the box below"
              onSave={handleSignatureSave}
              onClear={() => {}}
              width={480}
              height={160}
            />
            {sigSaving && <p className="text-xs text-muted">Saving signature…</p>}
            <button
              onClick={() => setShowSigPad(false)}
              aria-label="Cancel signing"
              className="text-xs text-muted underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSigPad(true)}
            aria-label="Open signature pad to sign the declaration"
            className="flex items-center gap-2 px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white hover:border-copper transition-colors"
          >
            <PenLine className="w-4 h-4 text-copper" aria-hidden="true" />
            Sign declaration
          </button>
        )}

        <p className="text-xs text-muted">
          Date: {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
