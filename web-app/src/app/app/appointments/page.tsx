/**
 * Appointments list — scheduled visits
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Appointment {
  id: string
  case_id: string
  scheduled_at: string
  address: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  case?: { id: string; case_number: string; client_name: string }
}

export default function AppointmentsPage() {
  const [list, setList] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const from = new Date()
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setMonth(to.getMonth() + 2)
    fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Appointments</h1>
        <p className="text-slate mt-1">Scheduled visits. Create from a case.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D4CFC7] rounded-lg">
          <p className="text-slate font-medium">No appointments</p>
          <p className="text-sm text-muted mt-1">Open a case and add a scheduled visit from the case page.</p>
          <Link href="/app/cases" className="inline-block mt-4 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium">View cases</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between py-4 px-4 bg-white border border-[#D4CFC7] rounded-lg"
            >
              <div>
                <p className="font-medium text-slate">
                  {new Date(apt.scheduled_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="text-sm text-muted">
                  {apt.case?.case_number} · {apt.case?.client_name}
                </p>
                {apt.address && <p className="text-xs text-muted mt-0.5">{apt.address}</p>}
              </div>
              <Link
                href={`/app/cases/${apt.case_id}`}
                className="text-sm text-accent hover:underline"
              >
                Open case
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
