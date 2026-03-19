'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMandates, useDeleteMandate } from '@/hooks/use-mandates'
import { useClients } from '@/hooks/use-clients'
import { Search, Plus, ClipboardList, Trash2 } from 'lucide-react'
import { Mandate, VERTICAL_OPTIONS } from '@/lib/types/mandate'
import { formatDate } from '@/lib/utils/formatting'

export default function MandatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [verticalFilter, setVerticalFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const router = useRouter()
  const { data: mandates, isLoading } = useMandates()
  const { data: clients } = useClients()
  const deleteMandateMutation = useDeleteMandate()

  const filteredMandates = useMemo(() => {
    let result = mandates || []

    if (clientFilter) {
      if (clientFilter === '__org_wide__') {
        result = result.filter((m) => !m.client_id)
      } else {
        result = result.filter((m) => m.client_id === clientFilter)
      }
    }

    if (verticalFilter) {
      result = result.filter((m) => m.vertical === verticalFilter)
    }

    if (activeFilter === 'active') {
      result = result.filter((m) => m.is_active)
    } else if (activeFilter === 'inactive') {
      result = result.filter((m) => !m.is_active)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.client_name?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q)
      )
    }

    return result
  }, [mandates, clientFilter, verticalFilter, activeFilter, searchQuery])

  const handleDelete = async (id: string) => {
    try {
      await deleteMandateMutation.mutateAsync(id)
      setConfirmDeleteId(null)
    } catch {
      // handled by mutation state
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Mandates</h1>
          <p className="text-slate mt-1">
            {filteredMandates.length} mandate{filteredMandates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/app/mandates/new')}
          className="flex items-center gap-2 bg-copper text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Mandate
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate w-4 h-4" />
          <input
            type="text"
            placeholder="Search mandates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {clients && clients.length > 0 && (
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
          >
            <option value="">All clients</option>
            <option value="__org_wide__">Org-wide</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={verticalFilter}
          onChange={(e) => setVerticalFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
        >
          <option value="">All verticals</option>
          {VERTICAL_OPTIONS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as '' | 'active' | 'inactive')}
          className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
          <p className="text-slate mt-4">Loading mandates...</p>
        </div>
      ) : filteredMandates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-charcoal font-medium mb-1">
            {searchQuery || clientFilter || verticalFilter || activeFilter
              ? 'No mandates match your filters'
              : 'No mandates yet'}
          </p>
          <p className="text-slate text-sm">
            {searchQuery || clientFilter || verticalFilter || activeFilter
              ? 'Try adjusting your filters'
              : 'Create your first mandate to define requirement templates'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredMandates.map((mandate) => (
              <div
                key={mandate.id}
                className="p-5 hover:bg-gray-50 transition-colors flex items-start justify-between"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/app/mandates/${mandate.id}`)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-charcoal">{mandate.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        mandate.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {mandate.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {mandate.is_default && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-copper/10 text-copper">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate mt-1">
                    <span>{mandate.client_name || 'Org-wide'}</span>
                    <span>·</span>
                    <span>
                      {VERTICAL_OPTIONS.find((v) => v.value === mandate.vertical)?.label ||
                        mandate.vertical}
                    </span>
                    <span>·</span>
                    <span>{mandate.requirement_count || 0} requirements</span>
                  </div>
                  {mandate.description && (
                    <p className="text-xs text-slate mt-1 line-clamp-1">{mandate.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs text-slate">{formatDate(mandate.created_at)}</span>
                  {confirmDeleteId === mandate.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(mandate.id)}
                        className="text-xs text-red-600 font-medium hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-slate hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(mandate.id)}
                      className="text-slate hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
