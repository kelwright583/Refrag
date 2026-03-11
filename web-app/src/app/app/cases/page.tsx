/**
 * Cases page - list, filter, sort, search, paginate
 */

'use client'

import { useState, useMemo } from 'react'
import { useCases, useCreateCase } from '@/hooks/use-cases'
import { useClients } from '@/hooks/use-clients'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Case, CaseStatus, CasePriority } from '@/lib/types/case'
import { CreateCaseModal } from '@/components/CreateCaseModal'

const STATUS_OPTIONS: CaseStatus[] = [
  'draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed',
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', assigned: 'Assigned', site_visit: 'Site Visit',
  awaiting_quote: 'Awaiting Quote', reporting: 'Reporting', submitted: 'Submitted',
  additional: 'Additional', closed: 'Closed',
}

type TabValue = 'active' | 'closed' | 'all'
type SortField = 'created_at' | 'loss_date' | 'updated_at' | 'case_number'

const PAGE_SIZE = 20

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [tab, setTab] = useState<TabValue>('active')
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>('')
  const [clientFilter, setClientFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<CasePriority | ''>('')
  const [sortField, setSortField] = useState<SortField>('updated_at')
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const { data: cases, isLoading } = useCases()
  const { data: clients } = useClients()
  const createCase = useCreateCase()

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    let result = cases || []

    // Tab filter
    if (tab === 'active') {
      result = result.filter((c) => c.status !== 'closed')
    } else if (tab === 'closed') {
      result = result.filter((c) => c.status === 'closed')
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter)
    }

    // Client filter
    if (clientFilter) {
      result = result.filter((c) => c.client_id === clientFilter)
    }

    // Priority filter
    if (priorityFilter) {
      result = result.filter((c) => c.priority === priorityFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(q) ||
          c.client_name?.toLowerCase().includes(q) ||
          c.claim_reference?.toLowerCase().includes(q) ||
          c.insurer_reference?.toLowerCase().includes(q) ||
          c.insurer_name?.toLowerCase().includes(q) ||
          c.broker_name?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = (a as any)[sortField] || ''
      const bVal = (b as any)[sortField] || ''
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDesc ? -cmp : cmp
    })

    return result
  }, [cases, tab, statusFilter, clientFilter, priorityFilter, searchQuery, sortField, sortDesc])

  const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE)
  const paginatedCases = filteredCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  const handleFilterChange = () => setPage(1)

  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': case 'closed': return 'bg-green-100 text-green-800'
      default: return 'bg-copper/10 text-copper'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const TABS: { value: TabValue; label: string; count: number }[] = [
    { value: 'active', label: 'Active', count: (cases || []).filter((c) => c.status !== 'closed').length },
    { value: 'closed', label: 'Closed', count: (cases || []).filter((c) => c.status === 'closed').length },
    { value: 'all', label: 'All', count: (cases || []).length },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Cases</h1>
          <p className="text-slate mt-1">{filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-copper text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Case
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#D4CFC7]">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); handleFilterChange() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.value
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-slate'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate w-4 h-4" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange() }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as CaseStatus | ''); handleFilterChange() }}
          className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {clients && clients.length > 0 && (
          <select
            value={clientFilter}
            onChange={(e) => { setClientFilter(e.target.value); handleFilterChange() }}
            className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value as CasePriority | ''); handleFilterChange() }}
          className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <select
          value={`${sortField}:${sortDesc ? 'desc' : 'asc'}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split(':')
            setSortField(field as SortField)
            setSortDesc(dir === 'desc')
          }}
          className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
        >
          <option value="updated_at:desc">Last updated</option>
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="loss_date:desc">Loss date (newest)</option>
          <option value="loss_date:asc">Loss date (oldest)</option>
          <option value="case_number:asc">Case number (A-Z)</option>
        </select>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading cases...</p>
        </div>
      ) : paginatedCases.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-charcoal font-medium mb-1">
            {searchQuery || statusFilter || clientFilter ? 'No cases match your filters' : 'No cases yet'}
          </p>
          <p className="text-slate text-sm">
            {searchQuery || statusFilter || clientFilter
              ? 'Try adjusting your filters'
              : 'Create your first case to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {paginatedCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  onClick={() => router.push(`/app/cases/${caseItem.id}`)}
                  className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-charcoal">{caseItem.case_number}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(caseItem.status)}`}>
                          {STATUS_LABELS[caseItem.status] || caseItem.status.replace('_', ' ')}
                        </span>
                        {caseItem.priority !== 'normal' && (
                          <span className={`text-xs capitalize ${caseItem.priority === 'high' ? 'text-red-600 font-medium' : 'text-slate'}`}>
                            {caseItem.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-charcoal font-medium">{caseItem.client_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1">
                        {caseItem.insurer_name && <span>{caseItem.insurer_name}</span>}
                        {caseItem.claim_reference && <span>Claim: {caseItem.claim_reference}</span>}
                        {caseItem.loss_date && <span>Loss: {formatDate(caseItem.loss_date)}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{formatDate(caseItem.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredCases.length)} of {filteredCases.length}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate hover:text-charcoal disabled:text-muted disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-sm rounded ${
                      page === p ? 'bg-accent text-white' : 'text-slate hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate hover:text-charcoal disabled:text-muted disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateCaseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
        isLoading={createCase.isPending}
      />
    </div>
  )
}
