'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useCaseMandates, useRequirementChecks } from '@/hooks/use-mandates'
import type { CaseRequirementCheck, RequirementStatus } from '@/lib/types/mandate'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

interface CaseMandate {
  id: string
  name: string
  requirements?: { id: string; label: string; category?: string }[]
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-40 bg-[#D4CFC7] rounded" />
      <div className="h-2 rounded-full bg-[#D4CFC7]" />
      <div className="h-3 w-24 bg-[#D4CFC7] rounded" />
    </div>
  )
}

function statusIcon(status: RequirementStatus) {
  if (status === 'provided') {
    return <span className="w-4 h-4 flex items-center justify-center text-green-600 text-base font-bold">✓</span>
  }
  if (status === 'not_applicable') {
    return <span className="w-4 h-4 flex items-center justify-center text-muted text-sm">—</span>
  }
  return <span className="w-4 h-4 flex items-center justify-center text-muted text-sm">○</span>
}

function statusLabel(status: RequirementStatus) {
  if (status === 'provided') return <span className="text-xs text-green-600 font-medium">Provided</span>
  if (status === 'not_applicable') return <span className="text-xs text-muted">N/A</span>
  return <span className="text-xs text-muted">Missing</span>
}

function progressColour(pct: number): string {
  if (pct >= 80) return 'bg-green-600'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export function MandateProgressSection({ caseId }: SectionProps) {
  const { data: mandatesData, isLoading: loadingMandates, isError: errorMandates, refetch: refetchMandates } = useCaseMandates(caseId)
  const { data: checksData, isLoading: loadingChecks, isError: errorChecks, refetch: refetchChecks } = useRequirementChecks(caseId)

  const [showRequirements, setShowRequirements] = useState(false)

  const isLoading = loadingMandates || loadingChecks
  const isError = errorMandates || errorChecks

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm">Mandate progress</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm">Mandate progress</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load mandate data.</p>
          <button
            onClick={() => { refetchMandates(); refetchChecks() }}
            className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  const mandate: CaseMandate | null =
    Array.isArray(mandatesData) && mandatesData.length > 0
      ? (mandatesData[0] as CaseMandate)
      : mandatesData && !Array.isArray(mandatesData)
      ? (mandatesData as CaseMandate)
      : null

  const checks: CaseRequirementCheck[] = checksData ?? []

  const total = checks.length
  const provided = checks.filter((c) => c.status === 'provided').length
  const pct = total > 0 ? Math.round((provided / total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm">Mandate progress</span>
      </div>

      {!mandate ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-5 text-center space-y-2">
          <CheckCircle2 className="w-7 h-7 text-[#D4CFC7] mx-auto" />
          <p className="text-sm text-slate">No mandate assigned to this case.</p>
          <a href="#" className="text-xs text-copper hover:underline">Assign a mandate →</a>
        </div>
      ) : (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal">{mandate.name}</p>
            <a href="#" className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
              View full mandate <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">{provided} of {total} requirements met</span>
              <span className="text-xs font-medium text-charcoal">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#D4CFC7]">
              <div
                className={`h-2 rounded-full transition-all ${progressColour(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {total > 0 && (
            <div>
              <button
                onClick={() => setShowRequirements((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
              >
                {showRequirements ? (
                  <>Hide requirements <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show requirements <ChevronDown className="w-3 h-3" /></>
                )}
              </button>

              {showRequirements && (
                <div className="mt-2 space-y-1 max-h-56 overflow-y-auto pr-1">
                  {checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#D4CFC7] last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(check.status)}
                        <span className="text-xs text-charcoal truncate">{check.requirement?.label ?? ''}</span>
                      </div>
                      {statusLabel(check.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
