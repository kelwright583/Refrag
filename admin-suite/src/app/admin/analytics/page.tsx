/**
 * Analytics dashboard (admin)
 */

'use client'

import { useAnalytics } from '@/hooks/use-analytics'
import { Building2, Users, FileText, Image, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const { data: metrics, isLoading } = useAnalytics()

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-charcoal">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Analytics</h1>
        <p className="text-slate mt-1">Platform usage metrics and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Organisations"
          value={metrics.total_orgs}
          icon={<Building2 className="w-6 h-6" />}
          subtitle={`${metrics.active_orgs} active`}
        />
        <MetricCard
          title="Total Users"
          value={metrics.total_users}
          icon={<Users className="w-6 h-6" />}
        />
        <MetricCard
          title="Total Cases"
          value={metrics.total_cases}
          icon={<FileText className="w-6 h-6" />}
          subtitle={`${metrics.cases_last_30_days} in last 30 days`}
        />
        <MetricCard
          title="Total Evidence"
          value={metrics.total_evidence}
          icon={<Image className="w-6 h-6" />}
          subtitle={`${metrics.evidence_last_30_days} in last 30 days`}
        />
      </div>

      {/* Daily Stats Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Daily Activity (Last 30 Days)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-medium text-charcoal">Date</th>
                <th className="text-right py-2 px-4 font-medium text-charcoal">Cases</th>
                <th className="text-right py-2 px-4 font-medium text-charcoal">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {metrics.daily_stats.map((stat) => (
                <tr key={stat.date} className="border-b border-gray-100">
                  <td className="py-2 px-4 text-charcoal">
                    {new Date(stat.date).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="py-2 px-4 text-right text-charcoal">{stat.cases}</td>
                  <td className="py-2 px-4 text-right text-charcoal">{stat.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/**
 * Metric Card Component
 */
function MetricCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ReactNode
  subtitle?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate">{title}</h3>
        <div className="text-copper">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-charcoal">{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-slate mt-1">{subtitle}</p>}
    </div>
  )
}
