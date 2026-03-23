'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Plus, X, CalendarDays } from 'lucide-react'
import { useTodayAppointments, useCreateAppointment } from '@/hooks/use-appointments'
import { useCases } from '@/hooks/use-cases'
import type { Case } from '@/lib/types/case'
import type { Appointment } from '@/lib/api/appointments'

// ── New appointment form ──────────────────────────────────────────────────────

interface NewAppointmentFormProps {
  cases: Case[]
  onClose: () => void
}

function NewAppointmentForm({ cases, onClose }: NewAppointmentFormProps) {
  const createAppt = useCreateAppointment()
  const [caseId, setCaseId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [apptNotes, setApptNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !date || !time) return
    setError(null)
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
      await createAppt.mutateAsync({
        case_id: caseId,
        scheduled_at: scheduledAt,
        address: location.trim() || undefined,
        notes: apptNotes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full bg-white rounded-t-2xl px-4 py-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-charcoal">New Appointment</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Case select */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              Case *
            </label>
            <select
              required
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00]"
            >
              <option value="">Select a case…</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.client_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              Date *
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00]"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              Time *
            </label>
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Address or location"
              className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              value={apptNotes}
              onChange={(e) => setApptNotes(e.target.value)}
              rows={2}
              placeholder="Any notes for this appointment…"
              className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={createAppt.isPending}
            className="w-full py-3 bg-[#C72A00] text-white rounded-xl text-sm font-semibold hover:bg-[#a82300] disabled:opacity-60 transition-colors"
          >
            {createAppt.isPending ? 'Saving…' : 'Save Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldCalendarPage() {
  const [showNewForm, setShowNewForm] = useState(false)
  const { data: appointments = [], isLoading } = useTodayAppointments()
  const { data: cases = [] } = useCases()

  return (
    <div className="px-4 py-4">
      {showNewForm && (
        <NewAppointmentForm cases={cases} onClose={() => setShowNewForm(false)} />
      )}

      <h1 className="text-lg font-bold text-charcoal mb-1">Calendar</h1>
      <p className="text-sm text-muted mb-4">
        {new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <CalendarDays className="w-10 h-10 text-muted" strokeWidth={1.25} />
          <p className="text-sm font-medium text-charcoal">No appointments today</p>
          <p className="text-xs text-muted">Tap + to schedule a new appointment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(appointments as Appointment[])
            .sort(
              (a, b) =>
                new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            )
            .map((appt) => (
              <div
                key={appt.id}
                className="bg-white border border-[#D4CFC7] rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-charcoal">
                      {new Date(appt.scheduled_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {appt.case && (
                      <Link
                        href={`/app/field/cases/${appt.case_id}`}
                        className="text-sm text-[#C72A00] font-medium hover:underline"
                      >
                        {appt.case.case_number} — {appt.case.client_name}
                      </Link>
                    )}
                    {appt.address && (
                      <div className="flex items-start gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                        <p className="text-xs text-muted leading-snug">{appt.address}</p>
                      </div>
                    )}
                    {appt.notes && (
                      <p className="text-xs text-slate mt-1 leading-snug">{appt.notes}</p>
                    )}
                  </div>

                  {appt.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(appt.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-2.5 py-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-xs font-medium text-[#C72A00] hover:bg-[#F5F2EE] transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Navigate
                    </a>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowNewForm(true)}
        aria-label="New appointment"
        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-[#C72A00] text-white shadow-lg flex items-center justify-center hover:bg-[#a82300] active:scale-95 transition-all"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </button>
    </div>
  )
}
