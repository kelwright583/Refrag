/**
 * Analytics API route handler (admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

async function verifyStaff(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: staff, error } = await supabase
    .from('staff_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (error || !staff) {
    throw new Error('Not authorized - staff access required')
  }

  return staff.id
}

/**
 * GET /api/admin/analytics - Get analytics metrics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await verifyStaff(supabase)

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get metrics
    const [
      totalOrgs,
      totalUsers,
      totalCases,
      totalEvidence,
      activeOrgs,
      casesLast30Days,
      evidenceLast30Days,
    ] = await Promise.all([
      // Total organisations
      supabase
        .from('organisations')
        .select('id', { count: 'exact', head: true })
        .then((r) => r.count || 0),
      // Total users
      supabase
        .from('org_members')
        .select('user_id', { count: 'exact', head: true })
        .then((r) => {
          // Count unique users
          return r.data ? new Set(r.data.map((m: any) => m.user_id)).size : 0
        }),
      // Total cases
      supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .then((r) => r.count || 0),
      // Total evidence
      supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .then((r) => r.count || 0),
      // Active organisations
      supabase
        .from('organisations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .then((r) => r.count || 0),
      // Cases in last 30 days
      supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .then((r) => r.count || 0),
      // Evidence in last 30 days
      supabase
        .from('evidence')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .then((r) => r.count || 0),
    ])

    // Get daily stats for chart
    const dailyStats = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStart = new Date(date.setHours(0, 0, 0, 0))
      const dateEnd = new Date(date.setHours(23, 59, 59, 999))

      const [cases, evidence] = await Promise.all([
        supabase
          .from('cases')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())
          .then((r) => r.count || 0),
        supabase
          .from('evidence')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())
          .then((r) => r.count || 0),
      ])

      dailyStats.push({
        date: dateStart.toISOString().split('T')[0],
        cases,
        evidence,
      })
    }

    return NextResponse.json({
      total_orgs: totalOrgs,
      total_users: totalUsers,
      total_cases: totalCases,
      total_evidence: totalEvidence,
      active_orgs: activeOrgs,
      cases_last_30_days: casesLast30Days,
      evidence_last_30_days: evidenceLast30Days,
      daily_stats: dailyStats,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
