'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, ChevronDown, ChevronUp, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useCaseNotes, useUpsertCaseNote } from '@/hooks/use-case-notes'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type DamageArea = {
  id: string
  areaName: string
  customArea: string
  description: string
  cause: string
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Total Loss'
  estimatedCost: number
}

const AREA_OPTIONS = ['Kitchen', 'Bathroom', 'Bedroom', 'Lounge', 'Roof', 'Exterior', 'Other']
const CAUSE_OPTIONS = ['Storm', 'Fire', 'Water', 'Impact', 'Other']
const SEVERITY_OPTIONS: DamageArea['severity'][] = ['Minor', 'Moderate', 'Severe', 'Total Loss']

const SEVERITY_COLORS: Record<DamageArea['severity'], string> = {
  Minor: 'bg-blue-100 text-blue-700',
  Moderate: 'bg-amber-100 text-amber-700',
  Severe: 'bg-orange-100 text-orange-700',
  'Total Loss': 'bg-red-100 text-red-700',
}

const emptyForm = (): Omit<DamageArea, 'id'> => ({
  areaName: 'Kitchen',
  customArea: '',
  description: '',
  cause: 'Storm',
  severity: 'Minor',
  estimatedCost: 0,
})

function formatZar(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PropertyDamageSectionsSection({ caseId }: SectionProps) {
  const { data: notes, isLoading } = useCaseNotes(caseId, 'property_damage_areas')
  const upsert = useUpsertCaseNote(caseId)

  const [areas, setAreas] = useState<DamageArea[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Load from note on mount
  useEffect(() => {
    if (notes && notes.length > 0) {
      const raw = notes[0].content
      if (Array.isArray(raw)) {
        setAreas(raw as DamageArea[])
      }
    }
  }, [notes])

  const setF = (key: keyof typeof form, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const persist = async (updatedAreas: DamageArea[]) => {
    await upsert.mutateAsync({ noteType: 'property_damage_areas', content: updatedAreas })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSaveArea = async () => {
    if (!form.description && !form.areaName) return

    let updated: DamageArea[]
    if (editingId) {
      updated = areas.map((a) =>
        a.id === editingId ? { ...form, id: editingId } : a
      )
    } else {
      const newArea: DamageArea = { ...form, id: crypto.randomUUID() }
      updated = [...areas, newArea]
    }
    setAreas(updated)
    await persist(updated)
    setForm(emptyForm())
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (area: DamageArea) => {
    setForm({
      areaName: area.areaName,
      customArea: area.customArea,
      description: area.description,
      cause: area.cause,
      severity: area.severity,
      estimatedCost: area.estimatedCost,
    })
    setEditingId(area.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const updated = areas.filter((a) => a.id !== id)
    setAreas(updated)
    setConfirmDelete(null)
    await persist(updated)
  }

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const totalCost = areas.reduce((s, a) => s + (a.estimatedCost || 0), 0)

  const displayAreaName = (area: DamageArea) =>
    area.areaName === 'Other' && area.customArea ? area.customArea : area.areaName

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading damage areas…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-charcoal">
          <Building2 className="w-4 h-4" />
          <span className="text-sm font-semibold">Property Damage by Area</span>
        </div>
        {!showForm && (
          <button
            onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-copper text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Damage Area
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="border border-copper/30 rounded-xl p-5 bg-copper/5 space-y-4">
          <h4 className="text-sm font-semibold text-charcoal">
            {editingId ? 'Edit Damage Area' : 'New Damage Area'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Area Name</label>
              <select
                value={form.areaName}
                onChange={(e) => setF('areaName', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 bg-white"
              >
                {AREA_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {form.areaName === 'Other' && (
                <input
                  type="text"
                  value={form.customArea}
                  onChange={(e) => setF('customArea', e.target.value)}
                  placeholder="Specify area…"
                  className="mt-2 w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setF('severity', e.target.value as DamageArea['severity'])}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 bg-white"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate mb-1">Cause</label>
              <select
                value={form.cause}
                onChange={(e) => setF('cause', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 bg-white"
              >
                {CAUSE_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate mb-1">Estimated Reinstatement Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.estimatedCost || ''}
                  onChange={(e) => setF('estimatedCost', parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate mb-1">Damage Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setF('description', e.target.value)}
                rows={3}
                placeholder="Describe the damage in detail…"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveArea}
              disabled={upsert.isPending}
              className="px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {upsert.isPending ? 'Saving…' : editingId ? 'Update Area' : 'Save Area'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()) }}
              className="px-4 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Damage Areas List */}
      {areas.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <Building2 className="w-7 h-7 text-slate/30 mx-auto mb-3" />
          <p className="text-sm text-slate">No damage areas recorded yet</p>
          <p className="text-xs text-slate/70 mt-1">Click &ldquo;Add Damage Area&rdquo; to capture room-by-room damage</p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => {
            const isOpen = expanded.has(area.id)
            return (
              <div key={area.id} className="border border-[#D4CFC7] rounded-xl overflow-hidden bg-white">
                {/* Collapsed header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[#FAFAF8] transition-colors"
                  onClick={() => toggleExpand(area.id)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate/40 hover:text-slate">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <span className="text-sm font-medium text-charcoal">{displayAreaName(area)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[area.severity]}`}>
                      {area.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-charcoal">{formatZar(area.estimatedCost)}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(area)}
                        className="p-1.5 text-slate/40 hover:text-copper transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDelete === area.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(area.id)}
                            className="px-2 py-0.5 text-xs bg-red-500 text-white rounded font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-0.5 text-xs border border-[#D4CFC7] text-slate rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(area.id)}
                          className="p-1.5 text-slate/40 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-[#D4CFC7] bg-[#FAFAF8] px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-slate mb-1">Cause</p>
                      <p className="text-charcoal">{area.cause}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate mb-1">Severity</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[area.severity]}`}>
                        {area.severity}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate mb-1">Estimated Cost</p>
                      <p className="text-charcoal font-semibold">{formatZar(area.estimatedCost)}</p>
                    </div>
                    {area.description && (
                      <div className="sm:col-span-3">
                        <p className="text-xs font-medium text-slate mb-1">Description</p>
                        <p className="text-charcoal">{area.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Total */}
      {areas.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#D4CFC7]">
          <span className="text-sm text-slate">
            {areas.length} damage area{areas.length !== 1 ? 's' : ''}
            {saved && <span className="ml-3 text-emerald-600">✓ Saved</span>}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate">Total Estimated Damage:</span>
            <span className="text-lg font-bold text-charcoal">{formatZar(totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
