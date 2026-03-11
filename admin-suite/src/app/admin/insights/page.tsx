/**
 * Insights dashboard (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, BarChart3, Download } from 'lucide-react'

export default function InsightsPage() {
  // Get aggregated metrics (anonymized)
  const { data: insights, isLoading } = useQuery({
    queryKey: ['admin-insights'],
    queryFn: async () => {
      const supabase = createClient()

      // Get aggregated stats (no org-specific data)
      const [casesByStatus, evidenceByType, avgCasesPerOrg] = await Promise.all([
        // Cases by status
        supabase
          .from('cases')
          .select('status')
          .then((r) => {
            const counts: Record<string, number> = {}
            r.data?.forEach((c: any) => {
              counts[c.status] = (counts[c.status] || 0) + 1
            })
            return counts
          }),
        // Evidence by type
        supabase
          .from('evidence')
          .select('media_type')
          .then((r) => {
            const counts: Record<string, number> = {}
            r.data?.forEach((e: any) => {
              counts[e.media_type] = (counts[e.media_type] || 0) + 1
            })
            return counts
          }),
        // Average cases per org
        supabase
          .from('cases')
          .select('org_id')
          .then((r) => {
            const orgCounts: Record<string, number> = {}
            r.data?.forEach((c: any) => {
              orgCounts[c.org_id] = (orgCounts[c.org_id] || 0) + 1
            })
            const counts = Object.values(orgCounts)
            return counts.length > 0
              ? counts.reduce((a, b) => a + b, 0) / counts.length
              : 0
          }),
      ])

      return {
        cases_by_status: casesByStatus,
        evidence_by_type: evidenceByType,
        avg_cases_per_org: avgCasesPerOrg,
      }
    },
  })

  const handleExportCSV = () => {
    if (!insights) return

    // Create CSV content
    const csvRows = [
      ['Metric', 'Value'],
      ['Average Cases per Organisation', insights.avg_cases_per_org.toFixed(2)],
      ...Object.entries(insights.cases_by_status || {}).map(([status, count]) => [
        `Cases - ${status}`,
        count,
      ]),
      ...Object.entries(insights.evidence_by_type || {}).map(([type, count]) => [
        `Evidence - ${type}`,
        count,
      ]),
    ]

    const csvContent = csvRows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `insights-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading insights...</p>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-charcoal">No insights data available</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Insights</h1>
          <p className="text-slate mt-1">Aggregated platform metrics (anonymized)</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Cases by Status
          </h2>
          <div className="space-y-2">
            {Object.entries(insights.cases_by_status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-charcoal capitalize">{status.replace('_', ' ')}</span>
                <span className="text-lg font-bold text-charcoal">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence by Type */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evidence by Type
          </h2>
          <div className="space-y-2">
            {Object.entries(insights.evidence_by_type || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-charcoal capitalize">{type}</span>
                <span className="text-lg font-bold text-charcoal">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Average Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Key Metrics</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate mb-1">Average Cases per Organisation</p>
              <p className="text-2xl font-bold text-charcoal">
                {insights.avg_cases_per_org.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
