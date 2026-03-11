/**
 * Organisations list page (admin)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganisations } from '@/hooks/use-orgs'
import { OrganisationWithStats } from '@/lib/types/admin'
import { Search, Building2, Users, FileText } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = ['active', 'trial', 'suspended', 'closed'] as const

export default function OrganisationsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: orgs, isLoading } = useOrganisations({
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading organisations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Organisations</h1>
        <p className="text-slate mt-1">Manage all organisations</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate" />
            <input
              type="text"
              placeholder="Search organisations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Organisations List */}
      {orgs && orgs.length > 0 ? (
        <div className="space-y-4">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Building2 className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">No organisations found</p>
        </div>
      )}
    </div>
  )
}

/**
 * Organisation Card Component
 */
function OrgCard({ org }: { org: OrganisationWithStats }) {
  const router = useRouter()

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:border-copper transition-colors cursor-pointer"
      onClick={() => router.push(`/admin/orgs/${org.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-heading font-bold text-charcoal">{org.name}</h2>
            <span
              className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                statusColors[org.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {org.status}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
              {org.billing_status}
            </span>
          </div>
          <p className="text-sm text-slate mb-4">Slug: {org.slug}</p>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate" />
              <span className="text-charcoal">{org.member_count || 0} members</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate" />
              <span className="text-charcoal">{org.case_count || 0} cases</span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-slate">
          <p>Created: {new Date(org.created_at).toLocaleDateString('en-ZA')}</p>
        </div>
      </div>
    </div>
  )
}
