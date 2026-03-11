/**
 * Case search page (admin)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchCases } from '@/hooks/use-cases'
import { Search, FileText, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function CasesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: cases, isLoading } = useSearchCases(debouncedQuery)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Case Search</h1>
        <p className="text-slate mt-1">Search cases across all organisations</p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate" />
          <input
            type="text"
            placeholder="Search by case number, client name, or claim reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Searching...</p>
        </div>
      ) : cases && cases.length > 0 ? (
        <div className="space-y-4">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-copper transition-colors cursor-pointer"
              onClick={() => router.push(`/admin/cases/${caseItem.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-heading font-bold text-charcoal">
                      {caseItem.case_number}
                    </h2>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 capitalize">
                      {caseItem.status}
                    </span>
                  </div>
                  <p className="text-charcoal mb-2">{caseItem.client_name}</p>
                  {caseItem.org && (
                    <div className="flex items-center gap-2 text-sm text-slate">
                      <Building2 className="w-4 h-4" />
                      <span>{caseItem.org.name}</span>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-slate">
                  <p>{new Date(caseItem.created_at).toLocaleDateString('en-ZA')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : debouncedQuery ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">No cases found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Search className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">Enter a search query to find cases</p>
        </div>
      )}
    </div>
  )
}
