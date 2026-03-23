'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Timer, DollarSign } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type TimeType = 'Instruction' | 'File Review' | 'Site Visit' | 'Interview' | 'Surveillance' | 'Report Writing' | 'Admin' | 'Travel' | 'Other'
type DisbursementCategory = 'Travel' | 'Accommodation' | 'Copies' | 'Searches' | 'External Services' | 'Other'

interface TimeEntry {
  id: string
  date: string
  activity: string
  type: TimeType
  hours: number
  rate: number
}

interface DisbursementEntry {
  id: string
  date: string
  description: string
  category: DisbursementCategory
  amount: number
  taxable: boolean
}

type ActiveTab = 'time' | 'disbursements'

const STORAGE_KEY_PREFIX = 'time_disbursements_data_'
const VAT_RATE = 0.15

const emptyTimeEntry = (defaultRate: number): Omit<TimeEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  activity: '',
  type: 'Interview',
  hours: 1,
  rate: defaultRate,
})

const emptyDisb = (): Omit<DisbursementEntry, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  description: '',
  category: 'Travel',
  amount: 0,
  taxable: false,
})

function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TimeDisbursementsSection({ caseId, orgSettings }: SectionProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${caseId}`
  const defaultRate: number = orgSettings?.default_hourly_rate ?? 1500

  const [activeTab, setActiveTab] = useState<ActiveTab>('time')
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [disbEntries, setDisbEntries] = useState<DisbursementEntry[]>([])
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [showDisbForm, setShowDisbForm] = useState(false)
  const [timeForm, setTimeForm] = useState(emptyTimeEntry(defaultRate))
  const [disbForm, setDisbForm] = useState(emptyDisb())
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null)
  const [editingDisbId, setEditingDisbId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setTimeEntries(parsed.time || [])
        setDisbEntries(parsed.disbursements || [])
      }
    } catch {}
    setLoading(false)
  }, [storageKey])

  const persist = useCallback((time: TimeEntry[], disb: DisbursementEntry[]) => {
    setTimeEntries(time)
    setDisbEntries(disb)
    try { localStorage.setItem(storageKey, JSON.stringify({ time, disbursements: disb })) } catch {}
  }, [storageKey])

  // Time entry handlers
  const handleSaveTime = () => {
    if (!timeForm.activity.trim()) return
    if (editingTimeId) {
      persist(timeEntries.map(e => e.id === editingTimeId ? { id: e.id, ...timeForm } : e), disbEntries)
      setEditingTimeId(null)
    } else {
      persist([...timeEntries, { id: crypto.randomUUID(), ...timeForm }], disbEntries)
    }
    setTimeForm(emptyTimeEntry(defaultRate))
    setShowTimeForm(false)
  }

  const handleEditTime = (e: TimeEntry) => {
    setTimeForm({ date: e.date, activity: e.activity, type: e.type, hours: e.hours, rate: e.rate })
    setEditingTimeId(e.id)
    setShowTimeForm(true)
  }

  const handleDeleteTime = (id: string) => {
    persist(timeEntries.filter(e => e.id !== id), disbEntries)
    if (editingTimeId === id) { setEditingTimeId(null); setTimeForm(emptyTimeEntry(defaultRate)); setShowTimeForm(false) }
  }

  // Disbursement handlers
  const handleSaveDisb = () => {
    if (!disbForm.description.trim()) return
    if (editingDisbId) {
      persist(timeEntries, disbEntries.map(e => e.id === editingDisbId ? { id: e.id, ...disbForm } : e))
      setEditingDisbId(null)
    } else {
      persist(timeEntries, [...disbEntries, { id: crypto.randomUUID(), ...disbForm }])
    }
    setDisbForm(emptyDisb())
    setShowDisbForm(false)
  }

  const handleEditDisb = (e: DisbursementEntry) => {
    setDisbForm({ date: e.date, description: e.description, category: e.category, amount: e.amount, taxable: e.taxable })
    setEditingDisbId(e.id)
    setShowDisbForm(true)
  }

  const handleDeleteDisb = (id: string) => {
    persist(timeEntries, disbEntries.filter(e => e.id !== id))
    if (editingDisbId === id) { setEditingDisbId(null); setDisbForm(emptyDisb()); setShowDisbForm(false) }
  }

  // Totals
  const professionalFees = timeEntries.reduce((s, e) => s + (e.hours * e.rate), 0)
  const disbursementsTotal = disbEntries.reduce((s, e) => s + e.amount, 0)
  const subtotal = professionalFees + disbursementsTotal
  const vat = subtotal * VAT_RATE
  const total = subtotal + vat

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary panel */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-copper" />
          Financial Summary
        </h3>
        <div className="space-y-1.5 font-mono text-sm">
          <div className="flex justify-between text-charcoal">
            <span>Professional Fees:</span>
            <span>{fmt(professionalFees)}</span>
          </div>
          <div className="flex justify-between text-charcoal">
            <span>Disbursements:</span>
            <span>{fmt(disbursementsTotal)}</span>
          </div>
          <div className="border-t border-[#D4CFC7] my-1.5" />
          <div className="flex justify-between text-charcoal">
            <span>Subtotal:</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate/70">
            <span>VAT (15%):</span>
            <span>{fmt(vat)}</span>
          </div>
          <div className="border-t border-[#D4CFC7] my-1.5" />
          <div className="flex justify-between font-bold text-charcoal text-base">
            <span>TOTAL:</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4CFC7]">
        {(['time', 'disbursements'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-copper text-copper'
                : 'border-transparent text-slate hover:text-charcoal'
            }`}
          >
            {tab === 'time' ? 'Time Entries' : 'Disbursements'}
          </button>
        ))}
      </div>

      {/* TIME TAB */}
      {activeTab === 'time' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowTimeForm(!showTimeForm); setEditingTimeId(null); setTimeForm(emptyTimeEntry(defaultRate)) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Time Entry
            </button>
          </div>

          {showTimeForm && (
            <div className="border border-[#D4CFC7] rounded-xl bg-white p-5 space-y-3">
              <h4 className="text-sm font-semibold text-charcoal">{editingTimeId ? 'Edit Entry' : 'New Time Entry'}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Date</label>
                  <input
                    type="date"
                    value={timeForm.date}
                    onChange={e => setTimeForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate mb-1">Activity *</label>
                  <input
                    type="text"
                    value={timeForm.activity}
                    onChange={e => setTimeForm(p => ({ ...p, activity: e.target.value }))}
                    placeholder="Describe activity..."
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Type</label>
                  <select
                    value={timeForm.type}
                    onChange={e => setTimeForm(p => ({ ...p, type: e.target.value as TimeType }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  >
                    {(['Instruction', 'File Review', 'Site Visit', 'Interview', 'Surveillance', 'Report Writing', 'Admin', 'Travel', 'Other'] as TimeType[]).map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={timeForm.hours}
                    onChange={e => setTimeForm(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Rate (R/hr)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={timeForm.rate}
                    onChange={e => setTimeForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Amount</label>
                  <input
                    readOnly
                    value={fmt(timeForm.hours * timeForm.rate)}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-slate-50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowTimeForm(false); setEditingTimeId(null); setTimeForm(emptyTimeEntry(defaultRate)) }}
                  className="px-3 py-1.5 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTime}
                  disabled={!timeForm.activity.trim()}
                  className="px-4 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-40 font-medium"
                >
                  {editingTimeId ? 'Update' : 'Add Entry'}
                </button>
              </div>
            </div>
          )}

          {timeEntries.length === 0 && !showTimeForm ? (
            <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
              <Timer className="w-6 h-6 text-slate/30 mx-auto mb-1" />
              <p className="text-sm text-slate">No time entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D4CFC7] text-xs text-slate/60 text-left">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Activity</th>
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3 text-right">Hours</th>
                    <th className="pb-2 pr-3 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 w-14" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4CFC7]/50">
                  {timeEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="py-2 pr-3 text-charcoal">{entry.date}</td>
                      <td className="py-2 pr-3 text-charcoal max-w-xs truncate">{entry.activity}</td>
                      <td className="py-2 pr-3">
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{entry.type}</span>
                      </td>
                      <td className="py-2 pr-3 text-right text-charcoal">{entry.hours}</td>
                      <td className="py-2 pr-3 text-right text-slate/70">{fmt(entry.rate)}</td>
                      <td className="py-2 text-right font-medium text-charcoal">{fmt(entry.hours * entry.rate)}</td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditTime(entry)} aria-label="Edit time entry" className="p-1 text-slate hover:text-copper rounded">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteTime(entry.id)} aria-label="Delete time entry" className="p-1 text-slate hover:text-red-500 rounded">
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DISBURSEMENTS TAB */}
      {activeTab === 'disbursements' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowDisbForm(!showDisbForm); setEditingDisbId(null); setDisbForm(emptyDisb()) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Disbursement
            </button>
          </div>

          {showDisbForm && (
            <div className="border border-[#D4CFC7] rounded-xl bg-white p-5 space-y-3">
              <h4 className="text-sm font-semibold text-charcoal">{editingDisbId ? 'Edit Disbursement' : 'New Disbursement'}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Date</label>
                  <input
                    type="date"
                    value={disbForm.date}
                    onChange={e => setDisbForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate mb-1">Description *</label>
                  <input
                    type="text"
                    value={disbForm.description}
                    onChange={e => setDisbForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe disbursement..."
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Category</label>
                  <select
                    value={disbForm.category}
                    onChange={e => setDisbForm(p => ({ ...p, category: e.target.value as DisbursementCategory }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  >
                    {(['Travel', 'Accommodation', 'Copies', 'Searches', 'External Services', 'Other'] as DisbursementCategory[]).map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Amount (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={disbForm.amount}
                    onChange={e => setDisbForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disbForm.taxable}
                      onChange={e => setDisbForm(p => ({ ...p, taxable: e.target.checked }))}
                      className="w-4 h-4 accent-copper"
                    />
                    Taxable
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowDisbForm(false); setEditingDisbId(null); setDisbForm(emptyDisb()) }}
                  className="px-3 py-1.5 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDisb}
                  disabled={!disbForm.description.trim()}
                  className="px-4 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-40 font-medium"
                >
                  {editingDisbId ? 'Update' : 'Add Disbursement'}
                </button>
              </div>
            </div>
          )}

          {disbEntries.length === 0 && !showDisbForm ? (
            <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
              <p className="text-sm text-slate">No disbursements recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D4CFC7] text-xs text-slate/60 text-left">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3">Category</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2 text-center">Taxable</th>
                    <th className="pb-2 w-14" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4CFC7]/50">
                  {disbEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="py-2 pr-3 text-charcoal">{entry.date}</td>
                      <td className="py-2 pr-3 text-charcoal">{entry.description}</td>
                      <td className="py-2 pr-3">
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{entry.category}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-charcoal">{fmt(entry.amount)}</td>
                      <td className="py-2 text-center">
                        {entry.taxable ? <span className="text-xs text-green-600">Yes</span> : <span className="text-xs text-slate/40">No</span>}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditDisb(entry)} aria-label="Edit disbursement" className="p-1 text-slate hover:text-copper rounded">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteDisb(entry.id)} aria-label="Delete disbursement" className="p-1 text-slate hover:text-red-500 rounded">
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
