'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, FolderOpen, Plus } from 'lucide-react'
import { useCases } from '@/hooks/use-cases'
import type { Case, CaseStatus } from '@/lib/types/case'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'open' | 'site_visit' | 'reporting'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'site_visit', label: 'Site Visit' },
  { key: 'reporting', label: 'Reporting' },
]

const OPEN_STATUSES: CaseStatus[] = ['assigned', 'site_visit', 'awaiting_quote']
const REPORTING_STATUSES: CaseStatus[] = ['reporting', 'submitted']

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-700' },
  site_visit: { label: 'Site Visit', className: 'bg-amber-100 text-amber-700' },
  awaiting_quote: { label: 'Awaiting Quote', className: 'bg-orange-100 text-orange-700' },
  reporting: { label: 'Reporting', className: 'bg-purple-100 text-purple-700' },
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-700' },
  additional: { label: 'Additional', className: 'bg-cyan-100 text-cyan-700' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-600' },
}

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  normal: 'border-l-amber-400',
  low: 'border-l-gray-300',
}

function applyFilter(cases: Case[], filter: FilterKey): Case[] {
  switch (filter) {
    case 'open':
      return cases.filter((c) => OPEN_STATUSES.includes(c.status))
    case 'site_visit':
      return cases.filter((c) => c.status === 'site_visit')
    case 'reporting':
      return cases.filter((c) => REPORTING_STATUSES.includes(c.status))
    default:
      return cases
  }
}

function applySearch(cases: Case[], query: string): Case[] {
  if (!query.trim()) return cases
  const q = query.toLowerCase()
  return cases.filter(
    (c) =>
      c.case_number.toLowerCase().includes(q) ||
      c.client_name.toLowerCase().includes(q) ||
      (c.insurer_name ?? '').toLowerCase().includes(q)
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FieldCasesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: allCases = [], isLoading, refetch } = useCases()

  // Debounce search 300ms
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchInput])

  const filtered = useMemo(() => {
    const byFilter = applyFilter(allCases, activeFilter)
    return applySearch(byFilter, debouncedSearch)
  }, [allCases, activeFilter, debouncedSearch])

  // Sort newest first
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [filtered]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2 bg-white border-b border-[#D4CFC7]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="search"
            placeholder="Search cases..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeFilter === key
                  ? 'bg-[#C72A00] text-white border-[#C72A00]'
                  : 'bg-white text-slate border-[#D4CFC7] hover:border-[#C72A00]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Case list */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-10 h-10 text-muted mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-charcoal">No cases found</p>
            <p className="text-xs text-muted mt-1">
              {debouncedSearch ? 'Try a different search term' : 'No cases match the selected filter'}
            </p>
          </div>
        ) : (
          sorted.map((c) => {
            const badge = STATUS_BADGE[c.status]
            const borderColor = PRIORITY_BORDER[c.priority] ?? PRIORITY_BORDER.low
            return (
              <Link
                key={c.id}
                href={`/app/field/cases/${c.id}`}
                className={`block bg-white border border-[#D4CFC7] border-l-4 ${borderColor} rounded-lg px-3 py-3 hover:bg-[#FAFAF8] active:bg-[#F5F2EE] transition-colors`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-charcoal">{c.case_number}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate mt-0.5 truncate">{c.client_name}</p>
                    {c.insurer_name && (
                      <p className="text-xs text-muted truncate">{c.insurer_name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {c.loss_date && (
                      <p className="text-xs text-muted">
                        {new Date(c.loss_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Refresh button */}
      <div className="px-4 py-2 bg-white border-t border-[#D4CFC7]">
        <button
          onClick={() => refetch()}
          className="text-xs text-[#C72A00] font-medium hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* FAB */}
      <Link
        href="/app/cases?new=1"
        aria-label="New case"
        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-[#C72A00] text-white shadow-lg flex items-center justify-center hover:bg-[#a82300] active:scale-95 transition-all"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </Link>
    </div>
  )
}
