'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Edit2, ChevronDown, ChevronRight, Search, AlertTriangle } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type Severity = 'High' | 'Medium' | 'Low'
type Category = 'Fraud Indicator' | 'Policy Breach' | 'Inconsistency' | 'Corroboration' | 'Exculpatory' | 'Other'
type Source = 'Interview' | 'Document' | 'Observation' | 'Records Check' | 'Other'
type Status = 'Confirmed' | 'Unconfirmed' | 'Disputed'

interface Finding {
  id: string
  number: string
  statement: string
  category: Category
  severity: Severity
  source: Source
  status: Status
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'findings_data_'

const severityBorderClass: Record<Severity, string> = {
  High: 'border-red-200',
  Medium: 'border-amber-200',
  Low: 'border-blue-200',
}

const severityBadgeClass: Record<Severity, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-blue-100 text-blue-700',
}

const statusBadgeClass: Record<Status, string> = {
  Confirmed: 'bg-green-100 text-green-700',
  Unconfirmed: 'bg-slate-100 text-slate-600',
  Disputed: 'bg-orange-100 text-orange-700',
}

const emptyForm = (): Omit<Finding, 'id' | 'number' | 'createdAt'> => ({
  statement: '',
  category: 'Fraud Indicator',
  severity: 'Medium',
  source: 'Interview',
  status: 'Unconfirmed',
})

async function saveToCaseNote(caseId: string, findings: Finding[]) {
  try {
    await fetch(`/api/cases/${caseId}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'investigation_findings_data', content: JSON.stringify(findings) }),
    })
  } catch {
    // Non-fatal — local state is source of truth for now
  }
}

export function FindingsListSection({ caseId }: SectionProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${caseId}`
  const [findings, setFindings] = useState<Finding[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setFindings(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [storageKey])

  const persist = useCallback((updated: Finding[]) => {
    setFindings(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
    saveToCaseNote(caseId, updated)
  }, [caseId, storageKey])

  const generateNumber = (list: Finding[]) => {
    const n = list.length + 1
    return `F${String(n).padStart(3, '0')}`
  }

  const handleSave = () => {
    if (!form.statement.trim()) return
    if (editingId) {
      const updated = findings.map(f =>
        f.id === editingId ? { ...f, ...form } : f
      )
      persist(updated)
      setEditingId(null)
    } else {
      const newFinding: Finding = {
        id: crypto.randomUUID(),
        number: generateNumber(findings),
        ...form,
        createdAt: new Date().toISOString(),
      }
      persist([...findings, newFinding])
    }
    setForm(emptyForm())
    setShowForm(false)
  }

  const handleEdit = (f: Finding) => {
    setForm({ statement: f.statement, category: f.category, severity: f.severity, source: f.source, status: f.status })
    setEditingId(f.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    persist(findings.filter(f => f.id !== id))
    if (editingId === id) { setEditingId(null); setForm(emptyForm()); setShowForm(false) }
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const high = findings.filter(f => f.severity === 'High').length
  const medium = findings.filter(f => f.severity === 'Medium').length
  const low = findings.filter(f => f.severity === 'Low').length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <div className="flex items-center gap-1.5">
          <Search className="w-4 h-4 text-slate" />
          <span className="text-sm font-medium text-charcoal">Total: {findings.length}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">High: {high}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Medium: {medium}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Low: {low}</span>
        <div className="ml-auto">
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Finding
          </button>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-[#D4CFC7] rounded-xl bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-charcoal">
            {editingId ? 'Edit Finding' : `New Finding — ${generateNumber(findings)}`}
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Statement *</label>
            <textarea
              value={form.statement}
              onChange={e => setForm(p => ({ ...p, statement: e.target.value }))}
              rows={3}
              placeholder="Describe the finding in detail..."
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}
                className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Fraud Indicator', 'Policy Breach', 'Inconsistency', 'Corroboration', 'Exculpatory', 'Other'] as Category[]).map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}
                className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['High', 'Medium', 'Low'] as Severity[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => setForm(p => ({ ...p, source: e.target.value as Source }))}
                className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Interview', 'Document', 'Observation', 'Records Check', 'Other'] as Source[]).map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as Status }))}
                className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Confirmed', 'Unconfirmed', 'Disputed'] as Status[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()) }}
              className="px-3 py-1.5 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.statement.trim()}
              className="px-4 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 font-medium"
            >
              {editingId ? 'Update Finding' : 'Save Finding'}
            </button>
          </div>
        </div>
      )}

      {/* Findings list */}
      {findings.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-slate/30 mx-auto mb-2" />
          <p className="text-sm text-slate">No findings recorded yet. Click &quot;Add Finding&quot; to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {findings.map(finding => {
          const expanded = expandedIds.has(finding.id)
          return (
            <div
              key={finding.id}
              className={`border rounded-lg p-4 bg-white ${severityBorderClass[finding.severity]}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExpand(finding.id)} className="text-slate hover:text-charcoal">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="font-mono text-xs font-bold text-copper">{finding.number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeClass[finding.severity]}`}>
                    {finding.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass[finding.status]}`}>
                    {finding.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(finding)}
                    className="p-1 text-slate hover:text-copper rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(finding.id)}
                    className="p-1 text-slate hover:text-red-500 rounded transition-colors"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-charcoal mt-2 ml-6 line-clamp-2">{finding.statement}</p>

              {expanded && (
                <div className="mt-3 ml-6 space-y-2">
                  <p className="text-sm text-charcoal">{finding.statement}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      {finding.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      Source: {finding.source}
                    </span>
                    <span className="text-xs text-slate/50">
                      {new Date(finding.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
