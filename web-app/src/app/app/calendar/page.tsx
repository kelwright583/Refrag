/**
 * Calendar page — Day / Week / Month / Year views
 * Appointment detail card with reschedule, edit, directions, delete, view case
 */

'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useCalendarBlocks, useCalendarAppointments, useCreateCalendarBlock, useDeleteCalendarBlock } from '@/hooks/use-calendar'
import { useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from '@/hooks/use-appointments'
import { useCases } from '@/hooks/use-cases'
import { BlockType, BLOCK_TYPE_LABELS, BLOCK_TYPE_COLORS, CalendarBlock, CalendarAppointment } from '@/lib/types/calendar'
import { Case } from '@/lib/types/case'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, Clock,
  CalendarPlus, Search, ExternalLink, Navigation, Edit3,
  Check, FileText, StickyNote, RefreshCw, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { MapPreview, AddressAutocomplete } from '@/components/maps'

// ─── Helpers ──────────────────────────────────────────────
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function formatDateISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

type ViewMode = 'day' | 'week' | 'month' | 'year'

// ─── Main Component ───────────────────────────────────────
export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)

  // Compute date range
  const { from, to } = useMemo(() => {
    const now = currentDate
    switch (viewMode) {
      case 'day': {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        return { from: s.toISOString(), to: e.toISOString() }
      }
      case 'week': {
        const ws = startOfWeek(now)
        return { from: ws.toISOString(), to: addDays(ws, 7).toISOString() }
      }
      case 'month': {
        const ms = new Date(now.getFullYear(), now.getMonth(), 1)
        const gridStart = startOfWeek(ms)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const gridEnd = addDays(startOfWeek(addDays(lastDay, 6)), 7)
        return { from: gridStart.toISOString(), to: gridEnd.toISOString() }
      }
      case 'year': {
        return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString() }
      }
    }
  }, [viewMode, currentDate])

  const { data: blocks } = useCalendarBlocks(from, to)
  const { data: appointments } = useCalendarAppointments(from, to)
  const createBlock = useCreateCalendarBlock(from, to)
  const deleteBlock = useDeleteCalendarBlock(from, to)
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const deleteAppointment = useDeleteAppointment()

  const todayStr = formatDateISO(new Date())

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateISO(date)
    return {
      blocks: (blocks || []).filter((b) => formatDateISO(new Date(b.starts_at)) === dateStr),
      appointments: (appointments || []).filter((a) => formatDateISO(new Date(a.scheduled_at)) === dateStr),
    }
  }
  const getEventCountForDate = (date: Date) => {
    const { blocks: b, appointments: a } = getEventsForDate(date)
    return b.length + a.length
  }

  const navigate = (dir: -1 | 1) => {
    switch (viewMode) {
      case 'day': setCurrentDate(addDays(currentDate, dir)); break
      case 'week': setCurrentDate(addDays(currentDate, dir * 7)); break
      case 'month': setCurrentDate(addMonths(currentDate, dir)); break
      case 'year': setCurrentDate(new Date(currentDate.getFullYear() + dir, 0, 1)); break
    }
  }

  const headingText = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'week': {
        const ws = startOfWeek(currentDate)
        return `${ws.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} – ${addDays(ws, 6).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`
      }
      case 'month':
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      case 'year':
        return `${currentDate.getFullYear()}`
    }
  }, [viewMode, currentDate])

  // Callbacks for the detail card — mutations stay in CalendarPage for reliable cache invalidation
  const handleUpdateAppt = async (id: string, input: Record<string, any>) => {
    await updateAppointment.mutateAsync({ id, input })
  }
  const handleDeleteAppt = async (id: string) => {
    await deleteAppointment.mutateAsync(id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Calendar</h1>
          <p className="text-slate mt-1">Appointments, site visits, and time blocks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <CalendarPlus className="w-5 h-5" />
            Schedule Assessment
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Block Time
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-slate" />
          </button>
          <h2 className="text-lg font-medium text-charcoal min-w-[240px] text-center">{headingText}</h2>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-slate" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-accent hover:underline ml-2">Today</button>
        </div>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {(['day', 'week', 'month', 'year'] as ViewMode[]).map((vm) => (
            <button
              key={vm}
              onClick={() => setViewMode(vm)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${viewMode === vm ? 'bg-white shadow-sm text-charcoal font-medium' : 'text-muted hover:text-slate'}`}
            >
              {vm}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {viewMode === 'day' && (
        <DayView
          date={currentDate}
          blocks={blocks || []}
          appointments={appointments || []}
          onDeleteBlock={(id) => deleteBlock.mutate(id)}
          onApptClick={setSelectedAppointment}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          blocks={blocks || []}
          appointments={appointments || []}
          todayStr={todayStr}
          onDayClick={(d) => { setCurrentDate(d); setViewMode('day') }}
          onApptClick={setSelectedAppointment}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          todayStr={todayStr}
          getEventsForDate={getEventsForDate}
          onDayClick={(d) => { setCurrentDate(d); setViewMode('day') }}
          onApptClick={setSelectedAppointment}
        />
      )}
      {viewMode === 'year' && (
        <YearView
          currentDate={currentDate}
          todayStr={todayStr}
          getEventCountForDate={getEventCountForDate}
          onMonthClick={(m) => { setCurrentDate(new Date(currentDate.getFullYear(), m, 1)); setViewMode('month') }}
          onDayClick={(d) => { setCurrentDate(d); setViewMode('day') }}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateBlockModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (input) => { await createBlock.mutateAsync(input); setShowCreateModal(false) }}
          isLoading={createBlock.isPending}
        />
      )}
      {showScheduleModal && (
        <ScheduleAssessmentModal
          onClose={() => setShowScheduleModal(false)}
          onCreate={async (input) => { await createAppointment.mutateAsync(input); setShowScheduleModal(false) }}
          isLoading={createAppointment.isPending}
          defaultDate={currentDate}
        />
      )}

      {/* Appointment Detail Card */}
      {selectedAppointment && (
        <AppointmentDetailCard
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={handleUpdateAppt}
          onDelete={handleDeleteAppt}
          isBusy={updateAppointment.isPending || deleteAppointment.isPending}
        />
      )}
    </div>
  )
}

// ─── Appointment Detail Card ─────────────────────────────
function AppointmentDetailCard({
  appointment: appt, onClose, onUpdate, onDelete, isBusy,
}: {
  appointment: CalendarAppointment
  onClose: () => void
  onUpdate: (id: string, input: Record<string, any>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isBusy: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'editNotes' | 'editAddress'>('view')
  const [newDate, setNewDate] = useState(formatDateISO(new Date(appt.scheduled_at)))
  const [newTime, setNewTime] = useState(formatTime(appt.scheduled_at))
  const [newNotes, setNewNotes] = useState(appt.notes || '')
  const [newAddress, setNewAddress] = useState(appt.address || '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isCompleted = !!appt.completed_at

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [onClose])

  const handleReschedule = async () => {
    await onUpdate(appt.id, { scheduled_at: new Date(`${newDate}T${newTime}:00`).toISOString() })
    onClose()
  }
  const handleSaveNotes = async () => { await onUpdate(appt.id, { notes: newNotes || null }); onClose() }
  const handleSaveAddress = async () => { await onUpdate(appt.id, { address: newAddress || null }); onClose() }
  const handleMarkComplete = async () => { await onUpdate(appt.id, { completed_at: new Date().toISOString() }); onClose() }
  const handleUndoComplete = async () => { await onUpdate(appt.id, { completed_at: null }); onClose() }
  const handleDelete = async () => { await onDelete(appt.id); onClose() }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div ref={cardRef} className="bg-white rounded-xl shadow-xl max-w-md w-full border border-[#D4CFC7] overflow-hidden">
        {/* Header — charcoal/navy */}
        <div className={`border-b px-5 py-4 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-navy/5 border-navy/15'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <CalendarPlus className="w-4 h-4 text-navy" />
                )}
                <span className={`text-xs font-medium uppercase tracking-wide ${isCompleted ? 'text-green-600' : 'text-navy'}`}>
                  {isCompleted ? 'Completed' : 'Assessment'}
                </span>
              </div>
              <h3 className="text-lg font-heading font-bold text-charcoal">
                {appt.case_number || 'Appointment'}
              </h3>
              {appt.client_name && <p className="text-sm text-slate mt-0.5">{appt.client_name}</p>}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/60 rounded"><X className="w-4 h-4 text-muted" /></button>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3 border-b border-[#D4CFC7]">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-navy mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-charcoal">{formatDateLong(appt.scheduled_at)} at {formatTime(appt.scheduled_at)}</p>
          </div>
          {appt.address && (
            <>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-navy mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-charcoal">{appt.address}</p>
                  <a href={mapsUrl(appt.address)} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-xs text-navy hover:underline mt-1 font-medium">
                    <Navigation className="w-3 h-3" /> Get directions
                  </a>
                </div>
              </div>
              <MapPreview address={appt.address} height={160} className="mt-1" />
            </>
          )}
          {appt.notes && (
            <div className="flex items-start gap-3">
              <StickyNote className="w-4 h-4 text-navy mt-0.5 shrink-0" />
              <p className="text-sm text-slate">{appt.notes}</p>
            </div>
          )}
        </div>

        {/* Inline edit: Reschedule */}
        {mode === 'reschedule' && (
          <div className="px-5 py-4 border-b border-[#D4CFC7] bg-[#FAFAF8]">
            <p className="text-xs font-medium text-slate mb-2 uppercase tracking-wide">Reschedule</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                className="px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleReschedule} disabled={isBusy}
                className="flex-1 py-2 bg-accent text-white text-sm rounded-lg font-medium hover:opacity-95 disabled:opacity-50">
                {isBusy ? 'Saving...' : 'Confirm Reschedule'}
              </button>
              <button onClick={() => setMode('view')} className="px-3 py-2 text-sm text-muted hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Inline edit: Notes */}
        {mode === 'editNotes' && (
          <div className="px-5 py-4 border-b border-[#D4CFC7] bg-[#FAFAF8]">
            <p className="text-xs font-medium text-slate mb-2 uppercase tracking-wide">Edit Notes</p>
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3}
              placeholder="Gate code, contact on site, special instructions..."
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={isBusy}
                className="flex-1 py-2 bg-accent text-white text-sm rounded-lg font-medium hover:opacity-95 disabled:opacity-50">
                {isBusy ? 'Saving...' : 'Save Notes'}
              </button>
              <button onClick={() => setMode('view')} className="px-3 py-2 text-sm text-muted hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Inline edit: Address */}
        {mode === 'editAddress' && (
          <div className="px-5 py-4 border-b border-[#D4CFC7] bg-[#FAFAF8]">
            <p className="text-xs font-medium text-slate mb-2 uppercase tracking-wide">Edit Address</p>
            <div className="mb-3">
              <AddressAutocomplete
                value={newAddress}
                onChange={setNewAddress}
                placeholder="Assessment location"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveAddress} disabled={isBusy}
                className="flex-1 py-2 bg-accent text-white text-sm rounded-lg font-medium hover:opacity-95 disabled:opacity-50">
                {isBusy ? 'Saving...' : 'Save Address'}
              </button>
              <button onClick={() => setMode('view')} className="px-3 py-2 text-sm text-muted hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Actions */}
        {mode === 'view' && (
          <div className="px-5 py-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => setMode('reschedule')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-charcoal bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-[#D4CFC7]">
                <RefreshCw className="w-3.5 h-3.5" /> Reschedule
              </button>
              <button onClick={() => setMode('editNotes')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-charcoal bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-[#D4CFC7]">
                <Edit3 className="w-3.5 h-3.5" /> Edit Notes
              </button>
              <button onClick={() => setMode('editAddress')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-charcoal bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-[#D4CFC7]">
                <MapPin className="w-3.5 h-3.5" /> Edit Address
              </button>
              {!isCompleted ? (
                <button onClick={handleMarkComplete} disabled={isBusy}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> Mark Complete
                </button>
              ) : (
                <button onClick={handleUndoComplete} disabled={isBusy}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 disabled:opacity-50">
                  <RefreshCw className="w-3.5 h-3.5" /> Undo Complete
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#D4CFC7]">
              <Link href={`/app/cases/${appt.case_id}`}
                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-white bg-accent hover:opacity-90 rounded-lg transition-opacity">
                <FileText className="w-3.5 h-3.5" /> View Case <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </Link>

              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3 h-3" /> Delete Appointment
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-700 flex-1">Are you sure? This cannot be undone.</p>
                  <button onClick={handleDelete} disabled={isBusy}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded font-medium hover:bg-red-700 disabled:opacity-50">
                    {isBusy ? '...' : 'Delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 text-xs text-muted hover:bg-white rounded">No</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Appointment Chip (charcoal/navy themed) ─────────────
function AppointmentChip({
  appointment: a, variant = 'full', onClick,
}: {
  appointment: CalendarAppointment
  variant?: 'full' | 'compact' | 'mini'
  onClick: (a: CalendarAppointment) => void
}) {
  const isCompleted = !!a.completed_at

  // Completed: muted green. Active: charcoal/navy.
  const baseClasses = isCompleted
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-navy/8 border-navy/15 text-charcoal'

  if (variant === 'mini') {
    return (
      <div onClick={(e) => { e.stopPropagation(); onClick(a) }}
        className={`rounded px-1 py-0.5 text-[10px] font-medium mb-0.5 truncate cursor-pointer transition-colors border ${baseClasses} hover:opacity-80`}>
        {isCompleted && <span className="mr-0.5">&#10003;</span>}
        {formatTime(a.scheduled_at)} {a.case_number}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div onClick={(e) => { e.stopPropagation(); onClick(a) }}
        className={`rounded px-2 py-1 text-xs mb-1 cursor-pointer transition-colors border ${baseClasses} hover:opacity-80`}>
        <p className="font-medium truncate">{formatTime(a.scheduled_at)}</p>
        <p className="truncate">{a.case_number || 'Appointment'}</p>
        {a.address && <p className="text-muted truncate">{a.address}</p>}
      </div>
    )
  }

  // full
  return (
    <div onClick={(e) => { e.stopPropagation(); onClick(a) }}
      className={`rounded px-3 py-2 cursor-pointer transition-colors border ${baseClasses} hover:opacity-80`}>
      <div className="flex items-center gap-2">
        {isCompleted ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Clock className="w-3 h-3 text-navy" />}
        <span className="text-xs font-medium">{formatTime(a.scheduled_at)}</span>
        <span className="text-xs font-medium">{a.case_number}</span>
        <span className="text-xs text-muted">{a.client_name}</span>
      </div>
      {a.address && (
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-muted" />
          <span className="text-xs text-muted">{a.address}</span>
        </div>
      )}
      {a.notes && (
        <div className="flex items-center gap-1 mt-1">
          <StickyNote className="w-3 h-3 text-muted" />
          <span className="text-xs text-muted truncate">{a.notes}</span>
        </div>
      )}
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────
function DayView({
  date, blocks, appointments, onDeleteBlock, onApptClick,
}: {
  date: Date; blocks: CalendarBlock[]; appointments: CalendarAppointment[]
  onDeleteBlock: (id: string) => void; onApptClick: (a: CalendarAppointment) => void
}) {
  const dateStr = formatDateISO(date)
  const dayBlocks = blocks.filter((b) => formatDateISO(new Date(b.starts_at)) === dateStr)
  const dayAppts = appointments.filter((a) => formatDateISO(new Date(a.scheduled_at)) === dateStr)

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-lg overflow-hidden">
      <div className="divide-y divide-[#D4CFC7]">
        {HOURS.map((hour) => {
          const hourAppts = dayAppts.filter((a) => new Date(a.scheduled_at).getHours() === hour)
          const hourBlocks = dayBlocks.filter((b) => new Date(b.starts_at).getHours() === hour)
          return (
            <div key={hour} className="flex min-h-[60px]">
              <div className="w-16 flex-shrink-0 py-2 px-2 text-xs text-muted text-right border-r border-[#D4CFC7]">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourAppts.map((a) => (
                  <AppointmentChip key={a.id} appointment={a} variant="full" onClick={onApptClick} />
                ))}
                {hourBlocks.map((b) => (
                  <div key={b.id} className={`flex items-center justify-between rounded px-3 py-2 border ${BLOCK_TYPE_COLORS[b.block_type]}`}>
                    <div>
                      <span className="text-xs font-medium">{formatTime(b.starts_at)} – {formatTime(b.ends_at)}</span>
                      <span className="text-xs ml-2">{b.title || BLOCK_TYPE_LABELS[b.block_type]}</span>
                    </div>
                    <button onClick={() => onDeleteBlock(b.id)} className="p-1 hover:bg-white/50 rounded"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────
function WeekView({
  currentDate, blocks, appointments, todayStr, onDayClick, onApptClick,
}: {
  currentDate: Date; blocks: CalendarBlock[]; appointments: CalendarAppointment[]
  todayStr: string; onDayClick: (d: Date) => void; onApptClick: (a: CalendarAppointment) => void
}) {
  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateISO(date)
    return {
      blocks: blocks.filter((b) => formatDateISO(new Date(b.starts_at)) === dateStr),
      appointments: appointments.filter((a) => formatDateISO(new Date(a.scheduled_at)) === dateStr),
    }
  }

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#D4CFC7]">
        {weekDays.map((day, i) => {
          const isToday = formatDateISO(day) === todayStr
          return (
            <button key={i} onClick={() => onDayClick(day)}
              className={`py-3 text-center border-r border-[#D4CFC7] last:border-r-0 hover:bg-[#FAFAF8] transition-colors ${isToday ? 'bg-navy/5' : ''}`}>
              <p className="text-xs text-muted">{DAY_LABELS[i]}</p>
              <p className={`text-lg font-medium ${isToday ? 'text-navy' : 'text-charcoal'}`}>{day.getDate()}</p>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {weekDays.map((day, i) => {
          const events = getEventsForDate(day)
          const isToday = formatDateISO(day) === todayStr
          return (
            <div key={i} className={`p-2 border-r border-[#D4CFC7] last:border-r-0 ${isToday ? 'bg-navy/5' : ''}`}>
              {events.appointments.map((a) => (
                <AppointmentChip key={a.id} appointment={a} variant="compact" onClick={onApptClick} />
              ))}
              {events.blocks.map((b) => (
                <div key={b.id} className={`rounded px-2 py-1 text-xs mb-1 border ${BLOCK_TYPE_COLORS[b.block_type]}`}>
                  <p className="font-medium truncate">{formatTime(b.starts_at)} – {formatTime(b.ends_at)}</p>
                  <p className="truncate">{b.title || BLOCK_TYPE_LABELS[b.block_type]}</p>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────
function MonthView({
  currentDate, todayStr, getEventsForDate, onDayClick, onApptClick,
}: {
  currentDate: Date; todayStr: string
  getEventsForDate: (d: Date) => { blocks: CalendarBlock[]; appointments: CalendarAppointment[] }
  onDayClick: (d: Date) => void; onApptClick: (a: CalendarAppointment) => void
}) {
  const month = currentDate.getMonth()
  const gridStart = startOfWeek(new Date(currentDate.getFullYear(), month, 1))
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#D4CFC7]">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted border-r border-[#D4CFC7] last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = formatDateISO(day) === todayStr
          const events = getEventsForDate(day)
          const totalEvents = events.blocks.length + events.appointments.length

          return (
            <div key={i} onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-1.5 border-r border-b border-[#D4CFC7] text-left transition-colors hover:bg-[#FAFAF8] cursor-pointer ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''} ${isToday ? 'bg-navy/5' : ''}`}>
              <p className={`text-xs font-medium mb-1 ${
                isToday ? 'text-white bg-navy rounded-full w-5 h-5 flex items-center justify-center' :
                isCurrentMonth ? 'text-charcoal' : 'text-muted/50'}`}>
                {day.getDate()}
              </p>
              {events.appointments.slice(0, 2).map((a) => (
                <AppointmentChip key={a.id} appointment={a} variant="mini" onClick={onApptClick} />
              ))}
              {events.blocks.slice(0, 2 - events.appointments.length).map((b) => (
                <div key={b.id} className={`rounded px-1 py-0.5 text-[10px] font-medium mb-0.5 truncate border ${BLOCK_TYPE_COLORS[b.block_type]}`}>
                  {b.title || BLOCK_TYPE_LABELS[b.block_type]}
                </div>
              ))}
              {totalEvents > 2 && <p className="text-[10px] text-muted mt-0.5">+{totalEvents - 2} more</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Year View ────────────────────────────────────────────
function YearView({
  currentDate, todayStr, getEventCountForDate, onMonthClick, onDayClick,
}: {
  currentDate: Date; todayStr: string; getEventCountForDate: (d: Date) => number
  onMonthClick: (month: number) => void; onDayClick: (d: Date) => void
}) {
  const year = currentDate.getFullYear()
  return (
    <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth key={m} year={year} month={m} todayStr={todayStr}
          getEventCountForDate={getEventCountForDate}
          onHeaderClick={() => onMonthClick(m)} onDayClick={onDayClick} />
      ))}
    </div>
  )
}

function MiniMonth({ year, month, todayStr, getEventCountForDate, onHeaderClick, onDayClick }: {
  year: number; month: number; todayStr: string; getEventCountForDate: (d: Date) => number
  onHeaderClick: () => void; onDayClick: (d: Date) => void
}) {
  const gridStart = startOfWeek(new Date(year, month, 1))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-lg overflow-hidden">
      <button onClick={onHeaderClick}
        className="w-full py-2 text-center text-sm font-medium text-charcoal hover:bg-[#FAFAF8] transition-colors border-b border-[#D4CFC7]">
        {MONTH_NAMES[month]}
      </button>
      <div className="grid grid-cols-7 px-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-muted py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-1 pb-1">
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = formatDateISO(day) === todayStr
          const count = isCurrentMonth ? getEventCountForDate(day) : 0
          if (!isCurrentMonth) return <div key={i} className="h-6" />
          return (
            <button key={i} onClick={() => onDayClick(day)}
              className={`h-6 flex items-center justify-center text-[10px] rounded-full transition-colors relative ${
                isToday ? 'bg-navy text-white font-bold' : 'text-charcoal hover:bg-gray-100'}`}>
              {day.getDate()}
              {count > 0 && !isToday && <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-navy" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Create Block Modal ───────────────────────────────────
function CreateBlockModal({ onClose, onCreate, isLoading }: {
  onClose: () => void
  onCreate: (input: { block_type: BlockType; title?: string; starts_at: string; ends_at: string; notes?: string }) => Promise<void>
  isLoading: boolean
}) {
  const [blockType, setBlockType] = useState<BlockType>('personal')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(formatDateISO(new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate({
      block_type: blockType, title: title || undefined,
      starts_at: new Date(`${date}T${startTime}:00`).toISOString(),
      ends_at: new Date(`${date}T${endTime}:00`).toISOString(),
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full border border-[#D4CFC7]">
        <div className="flex items-center justify-between p-5 border-b border-[#D4CFC7]">
          <h2 className="text-lg font-heading font-bold text-charcoal">Block Time</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                <button key={t} type="button" onClick={() => setBlockType(t)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors border ${
                    blockType === t ? BLOCK_TYPE_COLORS[t] : 'bg-gray-50 text-muted border-transparent'}`}>
                  {BLOCK_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Title (optional)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate"
              placeholder="e.g. Lunch, Travel to site..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Start</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">End</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate resize-none" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-2 bg-charcoal text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">
            {isLoading ? 'Creating...' : 'Create Block'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Schedule Assessment Modal ────────────────────────────
function ScheduleAssessmentModal({ onClose, onCreate, isLoading, defaultDate }: {
  onClose: () => void
  onCreate: (input: { case_id: string; scheduled_at: string; address?: string; notes?: string }) => Promise<void>
  isLoading: boolean; defaultDate: Date
}) {
  const { data: allCases, isLoading: casesLoading } = useCases()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [date, setDate] = useState(formatDateISO(defaultDate))
  const [time, setTime] = useState('09:00')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredCases = useMemo(() => {
    if (!allCases) return []
    if (!searchTerm) return allCases.slice(0, 10)
    const q = searchTerm.toLowerCase()
    return allCases.filter((c) =>
      c.case_number?.toLowerCase().includes(q) || c.client_name?.toLowerCase().includes(q) ||
      c.claim_reference?.toLowerCase().includes(q) || c.insurer_name?.toLowerCase().includes(q) ||
      c.insurer_reference?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q)
    ).slice(0, 15)
  }, [allCases, searchTerm])

  const handleSelectCase = (c: Case) => {
    setSelectedCase(c); setSearchTerm(''); setShowDropdown(false)
    if (c.location && !address) setAddress(c.location)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase) return
    await onCreate({
      case_id: selectedCase.id,
      scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
      address: address || undefined, notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full border border-[#D4CFC7]">
        <div className="flex items-center justify-between p-5 border-b border-[#D4CFC7]">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-navy" />
            <h2 className="text-lg font-heading font-bold text-charcoal">Schedule Assessment</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Case</label>
            {selectedCase ? (
              <div className="flex items-center justify-between bg-navy/5 border border-navy/15 rounded-lg px-3 py-2.5">
                <div>
                  <span className="text-sm font-medium text-charcoal">{selectedCase.case_number}</span>
                  <span className="text-sm text-muted ml-2">{selectedCase.client_name}</span>
                  {selectedCase.insurer_name && <span className="text-xs text-muted ml-2">({selectedCase.insurer_name})</span>}
                </div>
                <button type="button" onClick={() => setSelectedCase(null)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="text" value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by case number, client, claim ref..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D4CFC7] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {casesLoading ? (
                      <div className="px-3 py-4 text-sm text-muted text-center">Loading cases...</div>
                    ) : filteredCases.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted text-center">
                        {searchTerm ? 'No cases match your search' : 'No cases found'}
                      </div>
                    ) : filteredCases.map((c) => (
                      <button key={c.id} type="button" onClick={() => handleSelectCase(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#FAFAF8] transition-colors border-b border-[#D4CFC7] last:border-b-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-charcoal">{c.case_number}</span>
                            <span className="text-sm text-muted ml-2">{c.client_name}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                            c.status === 'closed' ? 'bg-green-100 text-green-800' :
                            c.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-navy/10 text-navy'}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                          {c.insurer_name && <span>{c.insurer_name}</span>}
                          {c.claim_reference && <span>Claim: {c.claim_reference}</span>}
                          {c.location && <span>{c.location}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Address</label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder="Assessment location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="e.g. Gate code, contact on site..."
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 text-slate resize-none" />
          </div>
          <button type="submit" disabled={isLoading || !selectedCase}
            className="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-40 transition-opacity">
            {isLoading ? 'Scheduling...' : 'Schedule Assessment'}
          </button>
        </form>
      </div>
    </div>
  )
}
