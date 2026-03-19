'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useCases } from '@/hooks/use-cases'
import { useTodayAppointments } from '@/hooks/use-appointments'
import { useClients } from '@/hooks/use-clients'
import {
  FileText,
  Users,
  Calendar,
  Mail,
  Receipt,
  ChevronRight,
  CheckCircle2,
  Circle,
  X,
  Rocket,
} from 'lucide-react'

const CASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  site_visit: 'Site visit',
  awaiting_quote: 'Awaiting quote',
  reporting: 'In reporting',
  submitted: 'Submitted',
  additional: 'Additional',
  closed: 'Closed',
}

const DISMISS_KEY = 'refrag:getting-started-dismissed'

interface SetupStatus {
  orgNameSet: boolean
  logoUploaded: boolean
  labourRatesConfigured: boolean
  repairerAdded: boolean
  firstCaseCreated: boolean
}

function useGettingStarted(caseCount: number) {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    }
  }, [])

  useEffect(() => {
    async function check() {
      try {
        const [profileRes, settingsRes, repairersRes] = await Promise.all([
          fetch('/api/org/profile'),
          fetch('/api/settings/assessment'),
          fetch('/api/settings/assessment/repairers'),
        ])

        let orgNameSet = false
        let logoUploaded = false
        if (profileRes.ok) {
          const profile = await profileRes.json()
          orgNameSet = !!profile.name
          logoUploaded = !!profile.logo_url
        }

        let labourRatesConfigured = false
        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (settings) {
            const rateKeys = [
              'labour_rate_panel', 'labour_rate_mechanical', 'labour_rate_electrical',
              'labour_rate_paint', 'labour_rate_structural', 'labour_rate_trim', 'labour_rate_glass',
            ]
            labourRatesConfigured = rateKeys.some((k) => (settings[k] ?? 0) > 0)
          }
        }

        let repairerAdded = false
        if (repairersRes.ok) {
          const list = await repairersRes.json()
          repairerAdded = Array.isArray(list) && list.length > 0
        }

        setStatus({
          orgNameSet,
          logoUploaded,
          labourRatesConfigured,
          repairerAdded,
          firstCaseCreated: caseCount > 0,
        })
      } catch {
        // Silently fail; card won't show
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [caseCount])

  const dismiss = useCallback(() => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, '1')
    }
  }, [])

  return { status, loading, dismissed, dismiss }
}

export default function DashboardPage() {
  const { data: cases, isLoading: casesLoading } = useCases()
  const { data: todayAppointments, isLoading: appointmentsLoading } = useTodayAppointments()
  const { data: clients } = useClients()

  const caseCount = (cases || []).length
  const { status: setupStatus, loading: setupLoading, dismissed, dismiss } = useGettingStarted(caseCount)

  const stats = useMemo(() => {
    const list = cases || []
    return {
      total: list.length,
      draft: list.filter((c) => c.status === 'draft').length,
      reporting: list.filter((c) => c.status === 'reporting').length,
      assigned: list.filter((c) => c.status === 'assigned').length,
      siteVisit: list.filter((c) => c.status === 'site_visit').length,
      submitted: list.filter((c) => c.status === 'submitted').length,
    }
  }, [cases])

  const priorityStatuses = ['draft', 'assigned', 'site_visit', 'reporting', 'awaiting_quote']
  const recentCases = useMemo(() => {
    return (cases || [])
      .sort((a, b) => {
        const aIdx = priorityStatuses.indexOf(a.status)
        const bIdx = priorityStatuses.indexOf(b.status)
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
        if (aIdx !== -1) return -1
        if (bIdx !== -1) return 1
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
      .slice(0, 5)
  }, [cases])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

  const links = [
    { href: '/app/cases', label: 'Cases', icon: FileText, desc: 'Manage cases and assignments', count: stats.total },
    { href: '/app/clients', label: 'Clients', icon: Users, desc: 'Insurers, fintechs, fleet managers', count: clients?.length ?? 0 },
    { href: '/app/appointments', label: 'Appointments', icon: Calendar, desc: 'Scheduled visits' },
    { href: '/app/inbound', label: 'Inbound', icon: Mail, desc: 'Review and create cases from emails' },
    { href: '/app/invoices', label: 'Invoices', icon: Receipt, desc: 'Create and manage invoices' },
  ]

  // Compute setup checklist items
  const checklistItems = setupStatus
    ? [
        { done: setupStatus.orgNameSet, label: 'Organisation name set', href: '/onboarding' },
        { done: setupStatus.logoUploaded, label: 'Logo uploaded', href: '/app/settings/stationery' },
        { done: setupStatus.labourRatesConfigured, label: 'Labour rates configured', href: '/app/settings/assessment' },
        { done: setupStatus.repairerAdded, label: 'Approved repairer added', href: '/app/settings/assessment' },
        { done: setupStatus.firstCaseCreated, label: 'First case created', href: '/app/cases' },
      ]
    : []

  const completedCount = checklistItems.filter((i) => i.done).length
  const totalChecklist = checklistItems.length
  const allDone = completedCount === totalChecklist

  const showChecklist = !setupLoading && setupStatus && !dismissed && !allDone

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Dashboard</h1>
        <p className="text-slate mt-1">Overview and quick access</p>
      </div>

      {/* Getting Started Checklist */}
      {showChecklist && (
        <div className="mb-8 relative">
          <div className="bg-white border-2 border-accent/30 rounded-xl overflow-hidden shadow-sm">
            {/* Gradient header strip */}
            <div className="h-1.5 bg-gradient-to-r from-accent via-copper to-accent" />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Rocket className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-charcoal">Getting Started</h2>
                    <p className="text-sm text-muted">Complete these steps to get the most out of Refrag</p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1.5 text-muted hover:text-charcoal hover:bg-[#F5F2EE] rounded-lg transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-charcoal">{completedCount} of {totalChecklist} complete</span>
                  <span className="text-sm text-muted">{Math.round((completedCount / totalChecklist) * 100)}%</span>
                </div>
                <div className="h-2 bg-[#F5F2EE] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-copper rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(completedCount / totalChecklist) * 100}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-1">
                {checklistItems.map((item) => (
                  <ChecklistRow key={item.label} {...item} />
                ))}
              </div>

              {/* CTA */}
              <div className="mt-5 pt-4 border-t border-[#D4CFC7]">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95 transition-opacity"
                >
                  Complete Setup <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's appointments */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-charcoal mb-3">Today</h2>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-5">
          {appointmentsLoading ? (
            <p className="text-muted">Loading...</p>
          ) : !todayAppointments || todayAppointments.length === 0 ? (
            <>
              <p className="text-slate font-medium">No appointments scheduled</p>
              <p className="text-sm text-muted mt-1">Add appointments from a case</p>
              <Link
                href="/app/cases"
                className="inline-block mt-3 text-sm font-medium text-accent hover:underline"
              >
                View cases →
              </Link>
            </>
          ) : (
            <>
              <p className="text-slate font-medium mb-3">
                {todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''} today
              </p>
              <div className="space-y-2">
                {todayAppointments.slice(0, 3).map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/app/cases/${apt.case_id}`}
                    className="flex items-center gap-4 py-2 hover:bg-[#F5F2EE] rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <span className="text-sm font-semibold text-charcoal w-14">
                      {formatTime(apt.scheduled_at)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate truncate">
                        {apt.case?.case_number ?? 'Case'}
                      </p>
                      <p className="text-sm text-muted truncate">{apt.case?.client_name ?? ''}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted shrink-0" />
                  </Link>
                ))}
              </div>
              {todayAppointments.length > 3 && (
                <Link
                  href="/app/appointments"
                  className="inline-block mt-3 text-sm font-medium text-accent hover:underline"
                >
                  View all appointments →
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Case status breakdown */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-charcoal mb-3">Cases</h2>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#30313A] text-white rounded-lg">
            <FileText className="w-5 h-5" />
            <span className="font-semibold">
              {casesLoading ? '—' : stats.total} total
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg">
            <span className="font-semibold">{casesLoading ? '—' : stats.draft} draft</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg">
            <span className="font-semibold">{casesLoading ? '—' : stats.reporting} in reporting</span>
          </div>
          {stats.assigned > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg">
              <span className="font-medium text-slate">{stats.assigned} assigned</span>
            </div>
          )}
          {stats.siteVisit > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg">
              <span className="font-medium text-slate">{stats.siteVisit} site visit</span>
            </div>
          )}
          {stats.submitted > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg">
              <span className="font-medium text-slate">{stats.submitted} submitted</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent cases needing attention */}
      {recentCases.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-charcoal mb-3">Recent / needs attention</h2>
          <div className="bg-white border border-[#D4CFC7] rounded-lg divide-y divide-[#D4CFC7]">
            {recentCases.map((c) => (
              <Link
                key={c.id}
                href={`/app/cases/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#F5F2EE] transition-colors"
              >
                <div>
                  <p className="font-medium text-slate">{c.case_number}</p>
                  <p className="text-sm text-muted">{c.client_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-charcoal text-white rounded">
                    {CASE_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted" />
                </div>
              </Link>
            ))}
            <Link
              href="/app/cases"
              className="block px-5 py-3 text-sm font-medium text-accent hover:bg-[#F5F2EE] rounded-b-lg transition-colors"
            >
              View all cases →
            </Link>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold text-charcoal mb-3">Quick access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ href, label, icon: Icon, desc, count }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
            >
              <span className="p-2 rounded-lg bg-slate/10 shrink-0">
                <Icon className="w-5 h-5 text-charcoal" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-slate">{label}</h2>
                <p className="text-sm text-muted truncate">{desc}</p>
              </div>
              {typeof count === 'number' && (
                <span className="text-lg font-bold text-accent shrink-0">{count}</span>
              )}
              <ChevronRight className="w-5 h-5 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChecklistRow({ done, label, href }: { done: boolean; label: string; href: string }) {
  if (done) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-sm text-slate line-through">{label}</span>
      </div>
    )
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F2EE] transition-colors group"
    >
      <Circle className="w-5 h-5 text-[#D4CFC7] group-hover:text-accent flex-shrink-0 transition-colors" />
      <span className="text-sm text-charcoal font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
