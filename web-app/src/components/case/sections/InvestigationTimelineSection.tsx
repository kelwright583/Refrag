'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Edit2, MapPin, User, FileText, Phone, Mail, Eye, Clock,
  Download, Calendar
} from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type ActivityType =
  | 'Site Visit'
  | 'Interview'
  | 'Document Review'
  | 'Records Check'
  | 'Surveillance'
  | 'Phone Call'
  | 'Email'
  | 'Report Writing'
  | 'Other'

interface TimelineEntry {
  id: string
  datetime: string
  activityType: ActivityType
  description: string
  outcome: string
  personsInvolved: string
  durationHours: number
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'investigation_timeline_'

const activityIcon: Record<ActivityType, React.ReactNode> = {
  'Site Visit': <MapPin className="w-4 h-4" />,
  'Interview': <User className="w-4 h-4" />,
  'Document Review': <FileText className="w-4 h-4" />,
  'Records Check': <FileText className="w-4 h-4" />,
  'Surveillance': <Eye className="w-4 h-4" />,
  'Phone Call': <Phone className="w-4 h-4" />,
  'Email': <Mail className="w-4 h-4" />,
  'Report Writing': <Clock className="w-4 h-4" />,
  'Other': <Calendar className="w-4 h-4" />,
}

const activityColorClass: Record<ActivityType, string> = {
  'Site Visit': 'bg-green-100 text-green-700',
  'Interview': 'bg-blue-100 text-blue-700',
  'Document Review': 'bg-purple-100 text-purple-700',
  'Records Check': 'bg-indigo-100 text-indigo-700',
  'Surveillance': 'bg-orange-100 text-orange-700',
  'Phone Call': 'bg-cyan-100 text-cyan-700',
  'Email': 'bg-pink-100 text-pink-700',
  'Report Writing': 'bg-amber-100 text-amber-700',
  'Other': 'bg-slate-100 text-slate-600',
}

const emptyForm = (): Omit<TimelineEntry, 'id' | 'createdAt'> => ({
  datetime: new Date().toISOString().slice(0, 16),
  activityType: 'Interview',
  description: '',
  outcome: '',
  personsInvolved: '',
  durationHours: 1,
})

function groupByDate(entries: TimelineEntry[]): Record<string, TimelineEntry[]> {
  const sorted = [...entries].sort((a, b) => a.datetime.localeCompare(b.datetime))
  return sorted.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const date = entry.datetime.slice(0, 10)
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {})
}

export function InvestigationTimelineSection({ caseId }: SectionProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${caseId}`
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setEntries(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [storageKey])

  const persist = useCallback((updated: TimelineEntry[]) => {
    setEntries(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
  }, [storageKey])

  const handleSave = () => {
    if (!form.description.trim()) return
    if (editingId) {
      persist(entries.map(e => e.id === editingId ? { ...e, ...form } : e))
      setEditingId(null)
    } else {
      persist([...entries, {
        id: crypto.randomUUID(),
        ...form,
        createdAt: new Date().toISOString(),
      }])
    }
    setForm(emptyForm())
    setShowForm(false)
  }

  const handleEdit = (entry: TimelineEntry) => {
    setForm({
      datetime: entry.datetime,
      activityType: entry.activityType,
      description: entry.description,
      outcome: entry.outcome,
      personsInvolved: entry.personsInvolved,
      durationHours: entry.durationHours,
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    persist(entries.filter(e => e.id !== id))
    if (editingId === id) { setEditingId(null); setForm(emptyForm()); setShowForm(false) }
  }

  const handleExport = () => {
    const sorted = [...entries].sort((a, b) => a.datetime.localeCompare(b.datetime))
    const lines = [
      `Investigation Timeline — Case ${caseId}`,
      '==========================================',
      '',
      ...sorted.map(e => [
        `${e.datetime.replace('T', ' ')} | ${e.activityType} — ${e.description}`,
        e.outcome ? `Outcome: ${e.outcome}` : null,
        e.personsInvolved ? `Persons: ${e.personsInvolved}` : null,
        `Duration: ${e.durationHours} hour${e.durationHours !== 1 ? 's' : ''}`,
        '',
      ].filter(Boolean).join('\n')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investigation-timeline-${caseId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const grouped = groupByDate(entries)
  const dateKeys = Object.keys(grouped)
  const totalHours = entries.reduce((s, e) => s + (e.durationHours || 0), 0)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate" />
          <span className="text-sm font-medium text-charcoal">{entries.length} entries · {totalHours.toFixed(1)} hrs total</span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-[#D4CFC7] rounded-xl bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-charcoal">{editingId ? 'Edit Entry' : 'New Timeline Entry'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Date &amp; Time *</label>
              <input
                type="datetime-local"
                value={form.datetime}
                onChange={e => setForm(p => ({ ...p, datetime: e.target.value }))}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Activity Type</label>
              <select
                value={form.activityType}
                onChange={e => setForm(p => ({ ...p, activityType: e.target.value as ActivityType }))}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Site Visit', 'Interview', 'Document Review', 'Records Check', 'Surveillance', 'Phone Call', 'Email', 'Report Writing', 'Other'] as ActivityType[]).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="What was done..."
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate mb-1">Outcome / Result</label>
              <textarea
                value={form.outcome}
                onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}
                rows={2}
                placeholder="What was the result or finding..."
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Person(s) Involved</label>
              <input
                type="text"
                value={form.personsInvolved}
                onChange={e => setForm(p => ({ ...p, personsInvolved: e.target.value }))}
                placeholder="Names..."
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.durationHours}
                onChange={e => setForm(p => ({ ...p, durationHours: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()) }}
              className="px-3 py-1.5 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.description.trim()}
              className="px-4 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 font-medium"
            >
              {editingId ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <Clock className="w-8 h-8 text-slate/30 mx-auto mb-2" />
          <p className="text-sm text-slate">No timeline entries yet. Document investigation activities as they occur.</p>
        </div>
      )}

      {/* Grouped timeline */}
      <div className="space-y-4">
        {dateKeys.map(date => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-[#D4CFC7]" />
              <span className="text-xs font-semibold text-slate/60 px-2">
                {new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <div className="h-px flex-1 bg-[#D4CFC7]" />
            </div>
            <div className="space-y-2 ml-4 border-l-2 border-[#D4CFC7] pl-4">
              {grouped[date].map(entry => (
                <div key={entry.id} className="bg-white border border-[#D4CFC7] rounded-lg p-4 relative">
                  <div className="absolute -left-[21px] top-4 w-4 h-4 rounded-full bg-copper/20 border-2 border-copper flex items-center justify-center text-copper">
                    <span className="w-2.5 h-2.5 flex items-center justify-center">
                      {activityIcon[entry.activityType]}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate/60">
                          {entry.datetime.slice(11, 16)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activityColorClass[entry.activityType]}`}>
                          {entry.activityType}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-copper/10 text-copper rounded-full font-medium">
                          {entry.durationHours} hr{entry.durationHours !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal">{entry.description}</p>
                      {entry.outcome && (
                        <p className="text-xs text-slate/70 italic">Outcome: {entry.outcome}</p>
                      )}
                      {entry.personsInvolved && (
                        <p className="text-xs text-slate/60">People: {entry.personsInvolved}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => handleEdit(entry)} className="p-1 text-slate hover:text-copper rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1 text-slate hover:text-red-500 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
