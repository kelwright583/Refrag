/**
 * Analytics API functions (admin)
 */

export interface AnalyticsMetrics {
  total_orgs: number
  total_users: number
  total_cases: number
  total_evidence: number
  active_orgs: number
  cases_last_30_days: number
  evidence_last_30_days: number
  daily_stats: Array<{
    date: string
    cases: number
    evidence: number
  }>
}

/**
 * Get analytics metrics
 */
export async function getAnalytics(orgId?: string, days: number = 30): Promise<AnalyticsMetrics> {
  const params = new URLSearchParams()
  if (orgId) params.append('org_id', orgId)
  params.append('days', days.toString())

  const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch analytics')
  }

  return response.json()
}
