'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Edit2, AlertTriangle } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type Severity = 'High' | 'Medium' | 'Low'
type RedFlagCategory =
  | 'Staged Loss'
  | 'Inflated Claim'
  | 'Identity Fraud'
  | 'Policy Fraud'
  | 'Previously Rejected'
  | 'Unusual Behaviour'
  | 'Inconsistent Account'
  | 'SIU History'
  | 'Other'

interface RedFlag {
  id: string
  category: RedFlagCategory
  description: string
  severity: Severity
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'red_flags_data_'

const severityBorderClass: Record<Severity, string> = {
  High: 'border-l-4 border-l-red-400',
  Medium: 'border-l-4 border-l-amber-400',
  Low: 'border-l-4 border-l-blue-400',
}

const severityBadgeClass: Record<Severity, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-blue-100 text-blue-700',
}

const severityDotClass: Record<Severity, string> = {
  High: 'bg-red-500',
  Medium: 'bg-amber-500',
  Low: 'bg-blue-500',
}

const emptyForm = (): Omit<RedFlag, 'id' | 'createdAt'> => ({
  category: 'Staged Loss',
  description: '',
  severity: 'High',
})

const SEVERITY_ORDER: Severity[] = ['High', 'Medium', 'Low']

export function RedFlagsSection({ caseId }: SectionProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${caseId}`
  const [flags, setFlags] = useState<RedFlag[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setFlags(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [storageKey])

  const persist = useCallback((updated: RedFlag[]) => {
    setFlags(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
  }, [storageKey])

  const handleSave = () => {
    if (!form.description.trim()) return
    if (editingId) {
      persist(flags.map(f => f.id === editingId ? { ...f, ...form } : f))
      setEditingId(null)
    } else {
      persist([...flags, {
        id: crypto.randomUUID(),
        ...form,
        createdAt: new Date().toISOString(),
      }])
    }
    setForm(emptyForm())
    setShowForm(false)
  }

  const handleEdit = (flag: RedFlag) => {
    setForm({ category: flag.category, description: flag.description, severity: flag.severity })
    setEditingId(flag.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    persist(flags.filter(f => f.id !== id))
    if (editingId === id) { setEditingId(null); setForm(emptyForm()); setShowForm(false) }
  }

  const sortedFlags = [...flags].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )

  const high = flags.filter(f => f.severity === 'High').length
  const medium = flags.filter(f => f.severity === 'Medium').length
  const low = flags.filter(f => f.severity === 'Low').length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <AlertTriangle className="w-4 h-4 text-slate" />
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${severityDotClass['High']}`} />
          <span className="text-xs font-medium text-charcoal">{high} High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${severityDotClass['Medium']}`} />
          <span className="text-xs font-medium text-charcoal">{medium} Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${severityDotClass['Low']}`} />
          <span className="text-xs font-medium text-charcoal">{low} Low</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Red Flag
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-[#D4CFC7] rounded-xl bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-charcoal">{editingId ? 'Edit Red Flag' : 'New Red Flag'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as RedFlagCategory }))}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {([
                  'Staged Loss', 'Inflated Claim', 'Identity Fraud', 'Policy Fraud',
                  'Previously Rejected', 'Unusual Behaviour', 'Inconsistent Account', 'SIU History', 'Other',
                ] as RedFlagCategory[]).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['High', 'Medium', 'Low'] as Severity[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Describe the red flag in detail..."
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
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
              {editingId ? 'Update' : 'Save Red Flag'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {flags.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-slate/30 mx-auto mb-2" />
          <p className="text-sm text-slate">No red flags recorded. Click &quot;Add Red Flag&quot; to log suspicious indicators.</p>
        </div>
      )}

      {/* Flags list */}
      <div className="space-y-2">
        {sortedFlags.map(flag => (
          <div
            key={flag.id}
            className={`border border-[#D4CFC7] rounded-lg p-4 bg-white ${severityBorderClass[flag.severity]}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeClass[flag.severity]}`}>
                    {flag.severity}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {flag.category}
                  </span>
                  <span className="text-xs text-slate/50">{new Date(flag.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-charcoal">{flag.description}</p>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={() => handleEdit(flag)} className="p-1 text-slate hover:text-copper rounded">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(flag.id)} className="p-1 text-slate hover:text-red-500 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
