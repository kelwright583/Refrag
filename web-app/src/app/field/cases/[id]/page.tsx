'use client'

import { useState, useRef, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Phone,
  Mail,
  Camera,
  CheckCircle2,
  Circle,
  MinusCircle,
  Plus,
  ImageIcon,
  WifiOff,
} from 'lucide-react'
import { useCase, useUpdateCaseStatus } from '@/hooks/use-cases'
import { useCaseContacts } from '@/hooks/use-contacts'
import { useEvidence, useUploadEvidence } from '@/hooks/use-evidence'
import { useCaseMandates, useRequirementChecks } from '@/hooks/use-mandates'
import { getCacheEntry, setCacheEntry } from '@/lib/cache/offline-case-cache'
import type { CaseStatus } from '@/lib/types/case'
import type { RequirementStatus, CaseRequirementCheck } from '@/lib/types/mandate'
import type { EvidenceWithTags } from '@/lib/types/evidence'
import type { Case } from '@/lib/types/case'

// ── Status config ─────────────────────────────────────────────────────────────

const ALL_STATUSES: CaseStatus[] = [
  'draft',
  'assigned',
  'site_visit',
  'awaiting_quote',
  'reporting',
  'submitted',
  'additional',
  'closed',
]

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  site_visit: 'Site Visit',
  awaiting_quote: 'Awaiting Quote',
  reporting: 'Reporting',
  submitted: 'Submitted',
  additional: 'Additional',
  closed: 'Closed',
}

const STATUS_BADGE_CLASSES: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  site_visit: 'bg-amber-100 text-amber-700',
  awaiting_quote: 'bg-orange-100 text-orange-700',
  reporting: 'bg-purple-100 text-purple-700',
  submitted: 'bg-green-100 text-green-700',
  additional: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-slate-100 text-slate-600',
}

type TabKey = 'overview' | 'evidence' | 'mandate' | 'notes'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'mandate', label: 'Mandate' },
  { key: 'notes', label: 'Notes' },
]

const PRIORITY_LABEL: Record<string, string> = { high: 'High', normal: 'Normal', low: 'Low' }
const PRIORITY_CLASSES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
}

function RequirementStatusIcon({ status }: { status: RequirementStatus }) {
  if (status === 'provided') return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
  if (status === 'not_applicable') return <MinusCircle className="w-4 h-4 text-gray-400 shrink-0" />
  return <Circle className="w-4 h-4 text-gray-300 shrink-0" />
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`
  }
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
}

// Cache URL keys for each data type
function cacheKey(caseId: string, type: string) {
  return `/api/cases/${caseId}/${type}`
}

// ── Cached data shape ─────────────────────────────────────────────────────────

interface CachedCaseData {
  caseData: Case
  evidence: EvidenceWithTags[]
  caseMandates: unknown[]
  requirementChecks: unknown[]
  cachedAt: string
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [optimisticStatus, setOptimisticStatus] = useState<CaseStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Offline state
  const [isOffline, setIsOffline] = useState(false)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [cachedData, setCachedData] = useState<CachedCaseData | null>(null)

  const { data: caseData, isLoading: caseLoading, isError: caseError } = useCase(id)
  const { data: contacts = [] } = useCaseContacts(id)
  const { data: evidence = [], isLoading: evidenceLoading, isError: evidenceError } = useEvidence(id)
  const { data: caseMandates = [], isError: mandatesError } = useCaseMandates(id)
  const { data: requirementChecks = [], isError: checksError } = useRequirementChecks(id)

  const updateStatus = useUpdateCaseStatus()
  const uploadEvidence = useUploadEvidence()

  // ── Store successful data to offline cache ─────────────────────────────────

  useEffect(() => {
    if (caseData) {
      setCacheEntry(cacheKey(id, 'case'), caseData).catch(() => {})
    }
  }, [caseData, id])

  useEffect(() => {
    if (evidence && evidence.length > 0) {
      setCacheEntry(cacheKey(id, 'evidence'), evidence).catch(() => {})
    }
  }, [evidence, id])

  useEffect(() => {
    if (caseMandates && caseMandates.length > 0) {
      setCacheEntry(cacheKey(id, 'mandates'), caseMandates).catch(() => {})
    }
  }, [caseMandates, id])

  useEffect(() => {
    if (requirementChecks && requirementChecks.length > 0) {
      setCacheEntry(cacheKey(id, 'checks'), requirementChecks).catch(() => {})
    }
  }, [requirementChecks, id])

  // ── Fall back to offline cache on error ────────────────────────────────────

  useEffect(() => {
    if (!caseError) return

    async function loadFromCache() {
      const cached = await getCacheEntry(cacheKey(id, 'case'))
      if (!cached) return

      const [evidenceCached, mandatesCached, checksCached] = await Promise.all([
        getCacheEntry(cacheKey(id, 'evidence')),
        getCacheEntry(cacheKey(id, 'mandates')),
        getCacheEntry(cacheKey(id, 'checks')),
      ])

      setCachedData({
        caseData: cached.data as Case,
        evidence: (evidenceCached?.data ?? []) as EvidenceWithTags[],
        caseMandates: (mandatesCached?.data ?? []) as unknown[],
        requirementChecks: (checksCached?.data ?? []) as unknown[],
        cachedAt: cached.cachedAt,
      })
      setCachedAt(cached.cachedAt)
      setIsOffline(true)
    }

    loadFromCache()
  }, [caseError, id])

  // ── Resolve data: live or cached ────────────────────────────────────────────

  const resolvedCaseData = caseData ?? cachedData?.caseData ?? null
  const resolvedEvidence = (evidenceError ? cachedData?.evidence : evidence) ?? []
  const resolvedMandates = (mandatesError ? cachedData?.caseMandates : caseMandates) ?? []
  const resolvedChecks = (checksError ? cachedData?.requirementChecks : requirementChecks) ?? []

  const currentStatus = optimisticStatus ?? resolvedCaseData?.status ?? 'draft'

  const handleStatusChange = async (status: CaseStatus) => {
    if (!resolvedCaseData || status === currentStatus) return
    setOptimisticStatus(status)
    try {
      await updateStatus.mutateAsync({ caseId: id, status })
    } finally {
      setOptimisticStatus(null)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      const mediaType = file.type.startsWith('image/')
        ? 'photo'
        : file.type.startsWith('video/')
          ? 'video'
          : 'document'
      await uploadEvidence.mutateAsync({
        caseId: id,
        file,
        mediaType,
        options: { capturedAt: new Date().toISOString() },
      })
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (caseLoading && !cachedData) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!resolvedCaseData) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted">Case not found</p>
        <Link href="/app/field/cases" className="text-xs text-[#C72A00] mt-2 inline-block">
          Back to cases
        </Link>
      </div>
    )
  }

  // Mandate data
  const assignedMandate = Array.isArray(resolvedMandates) ? resolvedMandates[0] : null
  const checks = (Array.isArray(resolvedChecks) ? resolvedChecks : []) as CaseRequirementCheck[]
  const checkedCount = checks.filter(
    (ch) => ch.status === 'provided'
  ).length
  const totalChecks = checks.length
  const progressPct = totalChecks > 0 ? Math.round((checkedCount / totalChecks) * 100) : 0

  return (
    <div className="flex flex-col">
      {/* Offline banner */}
      {isOffline && cachedAt && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2 mx-4 mt-3">
          <WifiOff className="w-3 h-3 flex-shrink-0" />
          Showing cached data from {formatTimeAgo(cachedAt)} — reconnect to refresh
        </div>
      )}

      {/* Back nav */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-1">
        <Link href="/app/field/cases" className="flex items-center gap-1 text-[#C72A00] text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          Cases
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 pb-3 border-b border-[#D4CFC7]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-charcoal">{resolvedCaseData.case_number}</h1>
            <p className="text-sm text-muted">{resolvedCaseData.client_name}</p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${PRIORITY_CLASSES[resolvedCaseData.priority]}`}
          >
            {PRIORITY_LABEL[resolvedCaseData.priority]}
          </span>
        </div>

        {/* Status pills — horizontal scroll */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              aria-label={`Set status to ${STATUS_LABELS[s]}`}
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                currentStatus === s
                  ? `${STATUS_BADGE_CLASSES[s]} border-current`
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-[#D4CFC7] bg-white sticky top-[57px] z-20">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            aria-label={`${label} tab`}
            className={`flex-1 shrink-0 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[#C72A00] text-[#C72A00]'
                : 'border-transparent text-muted hover:text-slate'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="px-4 py-4 space-y-5">
            {/* Instruction details */}
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Instruction Details
              </h2>
              <div className="bg-white border border-[#D4CFC7] rounded-lg divide-y divide-[#D4CFC7]">
                {[
                  { label: 'Insurer', value: resolvedCaseData.insurer_name },
                  { label: 'Claim Ref', value: resolvedCaseData.claim_reference },
                  {
                    label: 'Loss Date',
                    value: resolvedCaseData.loss_date
                      ? new Date(resolvedCaseData.loss_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : null,
                  },
                  { label: 'Location', value: resolvedCaseData.location },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="flex px-3 py-2.5 gap-3">
                      <span className="text-xs text-muted w-24 shrink-0">{label}</span>
                      <span className="text-xs text-charcoal font-medium">{value}</span>
                    </div>
                  ) : null
                )}
              </div>
            </section>

            {/* Contacts */}
            {contacts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Contacts
                </h2>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-white border border-[#D4CFC7] rounded-lg px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{contact.name}</p>
                          <span className="text-[10px] font-medium bg-[#F5F2EE] text-slate px-1.5 py-0.5 rounded">
                            {contact.type}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              aria-label={`Call ${contact.name}`}
                              className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              aria-label={`Email ${contact.name}`}
                              className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── EVIDENCE ──────────────────────────────────────── */}
        {activeTab === 'evidence' && (
          <div className="px-4 py-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileChange}
              aria-label="Upload evidence files"
            />

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-charcoal">
                Evidence ({resolvedEvidence.length})
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add photo evidence"
                className="flex items-center gap-1 px-3 py-1.5 bg-[#C72A00] text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Photo
              </button>
            </div>

            {evidenceLoading && !cachedData ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : resolvedEvidence.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="w-10 h-10 text-muted mb-3" strokeWidth={1.25} />
                <p className="text-sm font-medium text-charcoal">No evidence yet</p>
                <p className="text-xs text-muted mt-1">Tap &quot;Add Photo&quot; to capture evidence</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(resolvedEvidence as EvidenceWithTags[]).map((ev) => (
                  <div
                    key={ev.id}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative"
                  >
                    {ev.media_type === 'photo' ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/evidence/${ev.id}/file`}
                        alt={ev.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-1">
                        <ImageIcon className="w-7 h-7 text-muted" strokeWidth={1.25} />
                        <span className="text-[10px] text-muted text-center line-clamp-2">
                          {ev.file_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MANDATE ──────────────────────────────────────── */}
        {activeTab === 'mandate' && (
          <div className="px-4 py-4">
            {assignedMandate ? (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-charcoal">
                      {(assignedMandate as { name?: string }).name ?? 'Mandate'}
                    </h2>
                    {(assignedMandate as { insurer_name?: string }).insurer_name && (
                      <p className="text-xs text-muted">{(assignedMandate as { insurer_name?: string }).insurer_name}</p>
                    )}
                  </div>
                  {totalChecks > 0 && (
                    <span className="text-xs font-medium text-muted shrink-0">
                      {checkedCount}/{totalChecks}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {totalChecks > 0 && (
                  <div className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-[#C72A00] rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* Requirement checklist */}
                <div className="space-y-2">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center gap-3 bg-white border border-[#D4CFC7] rounded-lg px-3 py-2.5"
                    >
                      <RequirementStatusIcon status={check.status} />
                      <span className="text-sm text-charcoal">
                        {check.requirement?.label ?? 'Requirement'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-muted">No mandate assigned to this case</p>
              </div>
            )}
          </div>
        )}

        {/* ── NOTES ──────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="px-4 py-4">
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted gap-2">
              <p className="text-sm font-medium text-charcoal">Notes</p>
              <p className="text-xs text-muted">
                Case notes will appear here. Notes feature coming soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
