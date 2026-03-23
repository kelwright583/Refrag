'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Package, Loader2, Download, Mail, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react'
import { useReports } from '@/hooks/use-reports'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface PackItem {
  id: string
  label: string
  description: string
  checked: boolean
}

interface PreviousExport {
  id: string
  created_at: string
  export_type: string
  status?: string
  download_url?: string | null
}

const DEFAULT_PACK_ITEMS: Omit<PackItem, 'checked'>[] = [
  { id: 'assessment_report', label: 'Assessment Report (PDF)', description: 'The full generated report PDF' },
  { id: 'photo_evidence', label: 'Photo Evidence PDF', description: 'All photos compiled into a single PDF' },
  { id: 'signed_invoices', label: 'Signed Invoices', description: 'All invoices for this case' },
  { id: 'supporting_documents', label: 'Supporting Documents', description: 'All uploaded supporting documents' },
]

export function PackBuilderSection({ caseId, orgSettings }: SectionProps) {
  const { data: reports } = useReports(caseId)
  const report = reports?.[0] ?? null

  const [packItems, setPackItems] = useState<PackItem[]>(
    DEFAULT_PACK_ITEMS.map(item => ({ ...item, checked: true }))
  )
  const [generating, setGenerating] = useState(false)
  const [exportResult, setExportResult] = useState<{ id: string; url?: string } | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [previousExports, setPreviousExports] = useState<PreviousExport[]>([])
  const [loadingExports, setLoadingExports] = useState(true)

  const creditsRemaining: number = orgSettings?.credits_remaining ?? Infinity
  const hasCredits = creditsRemaining > 0

  useEffect(() => {
    const fetchExports = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/exports`)
        if (res.ok) {
          const data = await res.json()
          setPreviousExports(data || [])
        }
      } catch {}
      setLoadingExports(false)
    }
    fetchExports()
  }, [caseId])

  const toggleItem = (id: string) => {
    setPackItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  const selectedItems = packItems.filter(i => i.checked)

  const handleGenerate = async () => {
    if (!hasCredits) return
    if (selectedItems.length === 0) return

    setGenerating(true)
    setExportError(null)
    setExportResult(null)

    try {
      const res = await fetch(`/api/cases/${caseId}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report?.id ?? null,
          export_type: 'assessor_pack',
          items: selectedItems.map(i => i.id),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(err.error ?? 'Failed to generate pack')
      }

      const data = await res.json()
      setExportResult({ id: data.id, url: data.download_url })

      // Refresh exports list
      const exportsRes = await fetch(`/api/cases/${caseId}/exports`)
      if (exportsRes.ok) setPreviousExports(await exportsRes.json())
    } catch (err: any) {
      setExportError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const getMailtoLink = (exportId: string) => {
    const subject = encodeURIComponent(`Report Pack — Case ${caseId.slice(0, 8)}`)
    const body = encodeURIComponent(
      `Please find your report pack attached.\n\nExport ID: ${exportId}\n\nKind regards`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="space-y-5">
      {/* Credits check */}
      {!hasCredits && (
        <div className="flex items-center gap-3 p-4 border border-amber-200 bg-amber-50 rounded-xl">
          <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">No credits remaining</p>
            <p className="text-xs text-amber-700">You need credits to generate report packs.</p>
          </div>
          <a
            href="/settings/billing"
            className="text-xs font-medium text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            Purchase more
          </a>
        </div>
      )}

      {/* Pack items */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-copper" />
          <h3 className="text-sm font-semibold text-charcoal">Select items to include</h3>
        </div>
        <div className="space-y-2">
          {packItems.map(item => (
            <label
              key={item.id}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                item.checked ? 'border-copper/40 bg-copper/5' : 'border-[#D4CFC7] bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="w-4 h-4 accent-copper"
              />
              <div>
                <p className="text-sm font-medium text-charcoal">{item.label}</p>
                <p className="text-xs text-slate/60">{item.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !hasCredits || selectedItems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 font-medium text-sm"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4" />
            )}
            {generating ? 'Generating Pack...' : 'Generate Pack'}
          </button>
          {selectedItems.length === 0 && (
            <p className="text-xs text-slate/60 mt-2">Select at least one item to include.</p>
          )}
        </div>
      </div>

      {/* Error */}
      {exportError && (
        <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{exportError}</p>
        </div>
      )}

      {/* Success */}
      {exportResult && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">Pack generated successfully</p>
          </div>
          <div className="flex items-center gap-2">
            {exportResult.url && (
              <a
                href={exportResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-400 text-green-700 bg-white rounded-lg hover:bg-green-50 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download Pack
              </a>
            )}
            <a
              href={getMailtoLink(exportResult.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] text-charcoal bg-white rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Email Pack
            </a>
          </div>
        </div>
      )}

      {/* Previous exports */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-charcoal mb-3">Previous Packs</h3>
        {loadingExports ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />)}
          </div>
        ) : previousExports.length === 0 ? (
          <p className="text-xs text-slate/60">No packs generated yet.</p>
        ) : (
          <div className="space-y-2">
            {previousExports.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 border border-[#D4CFC7] rounded-lg">
                <div>
                  <p className="text-sm text-charcoal capitalize">{exp.export_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate/60">
                    {new Date(exp.created_at).toLocaleString('en-ZA')}
                  </p>
                </div>
                {exp.download_url ? (
                  <a
                    href={exp.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-copper hover:underline font-medium"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-slate/40">No link</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
