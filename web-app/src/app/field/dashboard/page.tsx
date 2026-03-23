'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Folder, Camera, Clock, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCases } from '@/hooks/use-cases'
import { useTodayAppointments } from '@/hooks/use-appointments'
import type { CaseStatus } from '@/lib/types/case'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

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

const OPEN_STATUSES: CaseStatus[] = ['assigned', 'site_visit', 'awaiting_quote', 'reporting']

function isCaseDueThisWeek(updatedAt: string): boolean {
  const date = new Date(updatedAt)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)
  return date >= now && date <= weekEnd
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FieldDashboardPage() {
  const [firstName, setFirstName] = useState<string>('')
  const [fabOpen, setFabOpen] = useState(false)

  const { data: cases = [], isLoading: casesLoading } = useCases()
  const { data: appointments = [], isLoading: appointmentsLoading } = useTodayAppointments()

  // Fetch first name from Supabase auth
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const meta = user.user_metadata as Record<string, string> | null
      const name =
        meta?.full_name?.split(' ')[0] ||
        meta?.first_name ||
        meta?.name?.split(' ')[0] ||
        user.email?.split('@')[0] ||
        'there'
      setFirstName(name)
    })
  }, [])

  const openCases = cases.filter((c) => OPEN_STATUSES.includes(c.status))
  const dueThisWeek = cases.filter(
    (c) => OPEN_STATUSES.includes(c.status) && isCaseDueThisWeek(c.updated_at)
  )
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const closeFab = useCallback(() => setFabOpen(false), [])

  return (
    <div className="relative">
      {/* Overlay to close FAB sheet */}
      {fabOpen && (
        <div className="fixed inset-0 z-40" onClick={closeFab} aria-hidden="true" />
      )}

      {/* Hero greeting */}
      <div className="bg-[#FAFAF8] px-4 pt-5 pb-4 border-b border-[#D4CFC7]">
        <p className="text-xl font-semibold text-charcoal">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </p>
        <p className="text-sm text-muted mt-0.5">{formatDate(new Date())}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-4">
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-charcoal">
            {casesLoading ? '—' : openCases.length}
          </p>
          <p className="text-[11px] text-muted mt-0.5 leading-tight">Open Cases</p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-charcoal">
            {casesLoading ? '—' : dueThisWeek.length}
          </p>
          <p className="text-[11px] text-muted mt-0.5 leading-tight">Due This Week</p>
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-charcoal">0</p>
          <p className="text-[11px] text-muted mt-0.5 leading-tight">Pending Uploads</p>
        </div>
      </div>

      {/* Recent Cases */}
      <section className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-charcoal">Recent Cases</h2>
          <Link href="/app/field/cases" className="text-xs text-[#C72A00] font-medium">
            View all
          </Link>
        </div>

        {casesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentCases.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">No cases yet</div>
        ) : (
          <div className="space-y-2">
            {recentCases.map((c) => {
              const badge = STATUS_BADGE[c.status]
              return (
                <Link
                  key={c.id}
                  href={`/app/field/cases/${c.id}`}
                  className="flex items-center gap-3 bg-white border border-[#D4CFC7] rounded-lg px-3 py-2.5 hover:bg-[#FAFAF8] active:bg-[#F5F2EE] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-charcoal truncate">
                        {c.case_number}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{c.client_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted shrink-0">
                    <Clock className="w-3 h-3" />
                    {daysAgo(c.updated_at)}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Today's Appointments */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-semibold text-charcoal mb-2">Today&apos;s Appointments</h2>

        {appointmentsLoading ? (
          <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ) : appointments.length === 0 ? (
          <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg py-6 text-center text-sm text-muted">
            No appointments today
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-white border border-[#D4CFC7] rounded-lg px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal">
                      {new Date(appt.scheduled_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {appt.case && (
                      <Link
                        href={`/app/field/cases/${appt.case_id}`}
                        className="text-xs text-[#C72A00] font-medium hover:underline"
                      >
                        {appt.case.case_number} — {appt.case.client_name}
                      </Link>
                    )}
                    {appt.address && (
                      <p className="text-xs text-muted mt-0.5 truncate">{appt.address}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        {/* FAB sheet */}
        {fabOpen && (
          <div className="absolute bottom-16 right-0 bg-white border border-[#D4CFC7] rounded-xl shadow-lg overflow-hidden min-w-[180px]">
            <Link
              href="/app/cases?new=1"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAFAF8] transition-colors border-b border-[#D4CFC7]"
              onClick={closeFab}
            >
              <Folder className="w-4 h-4 text-[#C72A00]" />
              <span className="text-sm font-medium text-charcoal">New Case</span>
            </Link>
            <Link
              href="/app/field/capture"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAFAF8] transition-colors"
              onClick={closeFab}
            >
              <Camera className="w-4 h-4 text-[#C72A00]" />
              <span className="text-sm font-medium text-charcoal">Quick Capture</span>
            </Link>
          </div>
        )}

        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-label="Open actions"
          className="w-14 h-14 rounded-full bg-[#C72A00] text-white shadow-lg flex items-center justify-center text-2xl font-light hover:bg-[#a82300] active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
