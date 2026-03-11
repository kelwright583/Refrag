'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import {
  useUpsertRepairAssessment,
  useCreateRepairLineItem,
  useUpdateRepairLineItem,
  useDeleteRepairLineItem,
  useCreatePreExistingDamage,
  useDeletePreExistingDamage,
} from '@/hooks/use-assessments'
import { Field, Section, Input, Select, ZarInput, formatZar } from './shared'
import type { FullMotorAssessment, RepairLineItem, OperationType } from '@/lib/types/assessment'
import { computeLineItemTotal } from '@/lib/assessment/calculator'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

const OP_TYPE_LABELS: Record<OperationType, string> = {
  panel: 'Panel',
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  paint: 'Paint',
  structural: 'Structural',
  trim: 'Trim',
  glass: 'Glass',
  other: 'Other',
}

const OP_TYPE_COLORS: Record<OperationType, string> = {
  panel: 'bg-blue-100 text-blue-700',
  mechanical: 'bg-orange-100 text-orange-700',
  electrical: 'bg-yellow-100 text-yellow-700',
  paint: 'bg-purple-100 text-purple-700',
  structural: 'bg-red-100 text-red-700',
  trim: 'bg-green-100 text-green-700',
  glass: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-600',
}

const defaultLineItem = () => ({
  description: '',
  operation_type: 'panel' as OperationType,
  qty: 1,
  parts_cost: 0,
  labour_hours: 0,
  labour_rate: 0,
  paint_cost: 0,
  paint_materials_cost: 0,
  strip_assm_cost: 0,
  frame_cost: 0,
  misc_cost: 0,
  is_sublet: false,
  sublet_supplier: '',
  betterment_applicable: false,
  betterment_percentage: 0,
  is_approved: true,
  notes: '',
})

export function DamagesLabourTab({ assessment, onNavigate }: Props) {
  const upsertRepair = useUpsertRepairAssessment(assessment.id)
  const createLineItem = useCreateRepairLineItem(assessment.id)
  const updateLineItem = useUpdateRepairLineItem(assessment.id)
  const deleteLineItem = useDeleteRepairLineItem(assessment.id)
  const createDamage = useCreatePreExistingDamage(assessment.id)
  const deleteDamage = useDeletePreExistingDamage(assessment.id)

  const [repairSaved, setRepairSaved] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newItem, setNewItem] = useState(defaultLineItem())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [ocrNote, setOcrNote] = useState<string | null>(null)
  const [newDamage, setNewDamage] = useState({ location: '', description: '', severity: 'minor' as const })
  const [addingDamage, setAddingDamage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ra = assessment.repair_assessment
  const [repairForm, setRepairForm] = useState({
    repairer_name: ra?.repairer_name ?? '',
    repairer_contact: ra?.repairer_contact ?? '',
    repairer_email: ra?.repairer_email ?? '',
    approved_repairer: ra?.approved_repairer ?? false,
    quoted_amount: ra?.quoted_amount ?? 0,
  })

  const setR = (key: string, value: unknown) => setRepairForm((f) => ({ ...f, [key]: value }))
  const setN = (key: string, value: unknown) => setNewItem((i) => ({ ...i, [key]: value }))

  const toggleExpand = (id: string) =>
    setExpandedRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleSaveRepair = async () => {
    await upsertRepair.mutateAsync(repairForm as any)
    setRepairSaved(true)
  }

  const handleAddItem = async () => {
    if (!newItem.description) return
    await createLineItem.mutateAsync(newItem as any)
    setNewItem(defaultLineItem())
    setShowAddRow(false)
  }

  const handleToggleApprove = async (item: RepairLineItem) => {
    await updateLineItem.mutateAsync({ lineItemId: item.id, input: { is_approved: !item.is_approved } })
  }

  const handleAddDamage = async () => {
    if (!newDamage.location.trim()) return
    await createDamage.mutateAsync(newDamage as any)
    setNewDamage({ location: '', description: '', severity: 'minor' })
    setAddingDamage(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const processFile = (_file: File) => {
    setOcrNote('Processing repairer quotation with OCR…')
    setTimeout(() => setOcrNote('OCR complete. Review and add line items from the extracted data.'), 1500)
  }

  const grandTotal = assessment.repair_line_items.reduce((sum, item) => {
    const total = computeLineItemTotal({
      parts_cost: item.parts_cost,
      labour_cost: item.labour_cost,
      paint_cost: item.paint_cost,
      paint_materials_cost: item.paint_materials_cost,
      strip_assm_cost: item.strip_assm_cost,
      frame_cost: item.frame_cost,
      misc_cost: item.misc_cost,
      qty: item.qty,
      is_approved: item.is_approved,
    })
    return sum + total
  }, 0)

  const maxRepair = assessment.vehicle_values?.max_repair_value ?? null
  const isUneconomical = maxRepair != null && grandTotal > maxRepair

  return (
    <div className="space-y-5">
      {/* Pre-existing Damages */}
      <Section title="Pre-existing Damages">
        {assessment.pre_existing_damages.length === 0 && !addingDamage && (
          <p className="text-sm text-slate mb-3">No pre-existing damages recorded.</p>
        )}
        {assessment.pre_existing_damages.length > 0 && (
          <div className="space-y-2 mb-4">
            {assessment.pre_existing_damages.map((d) => (
              <div key={d.id} className="flex items-start justify-between py-2 px-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
                <div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                    d.severity === 'minor' ? 'bg-yellow-100 text-yellow-700'
                    : d.severity === 'moderate' ? 'bg-orange-100 text-orange-700'
                    : 'bg-red-100 text-red-700'
                  }`}>{d.severity}</span>
                  <span className="text-sm text-charcoal font-medium">{d.location}</span>
                  {d.description && <p className="text-xs text-slate mt-0.5">{d.description}</p>}
                </div>
                <button
                  onClick={() => deleteDamage.mutate(d.id)}
                  className="text-slate/40 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {addingDamage ? (
          <div className="border border-copper/30 rounded-lg p-4 bg-copper/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Field label="Location / Panel">
                  <Input
                    value={newDamage.location}
                    onChange={(e) => setNewDamage({ ...newDamage, location: e.target.value })}
                    placeholder="e.g. Left front door, bonnet…"
                    autoFocus
                  />
                </Field>
              </div>
              <Field label="Severity">
                <Select value={newDamage.severity} onChange={(e) => setNewDamage({ ...newDamage, severity: e.target.value as any })}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </Select>
              </Field>
            </div>
            <Field label="Description (optional)">
              <Input
                value={newDamage.description}
                onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
                placeholder="Brief description…"
              />
            </Field>
            <div className="flex gap-2">
              <button
                onClick={handleAddDamage}
                disabled={createDamage.isPending || !newDamage.location}
                className="px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createDamage.isPending ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => setAddingDamage(false)} className="px-4 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingDamage(true)}
            className="flex items-center gap-2 text-sm text-copper hover:opacity-80 transition-opacity font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Pre-existing Damage
          </button>
        )}
      </Section>

      {/* OCR import */}
      <Section title="Import Repairer Quotation (OCR)">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,image/*" className="hidden" onChange={handleFileInput} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
            dragging ? 'border-copper bg-copper/5' : 'border-[#D4CFC7] hover:border-copper/50'
          }`}
        >
          <Upload className={`w-7 h-7 ${dragging ? 'text-copper' : 'text-slate/40'}`} />
          <p className="text-sm font-medium text-charcoal">Drop repairer quote here or click to browse</p>
          <p className="text-xs text-slate">PDF or image — OCR extracts line items, labour hours &amp; parts costs</p>
        </div>
        {ocrNote && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">{ocrNote}</p>}
      </Section>

      {/* Repairer Details */}
      <Section title="Repairer Details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Repairer / Workshop Name">
            <Input value={repairForm.repairer_name} onChange={(e) => setR('repairer_name', e.target.value)} />
          </Field>
          <Field label="Contact Number">
            <Input value={repairForm.repairer_contact} onChange={(e) => setR('repairer_contact', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={repairForm.repairer_email} onChange={(e) => setR('repairer_email', e.target.value)} />
          </Field>
          <Field label="Quoted Amount (excl. VAT)">
            <ZarInput value={repairForm.quoted_amount} onChange={(v) => setR('quoted_amount', v)} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={repairForm.approved_repairer}
                onChange={(e) => setR('approved_repairer', e.target.checked)}
                className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
              />
              <span className="text-sm text-charcoal">Approved panel repairer</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t border-[#D4CFC7]">
          <button
            onClick={handleSaveRepair}
            disabled={upsertRepair.isPending}
            className="px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {upsertRepair.isPending ? 'Saving...' : repairSaved ? '✓ Saved' : 'Save Repairer'}
          </button>
        </div>
      </Section>

      {/* Repair Line Items */}
      <Section title="Repair Line Items (Labour)">
        <div className="hidden lg:grid grid-cols-12 gap-2 text-xs font-medium text-slate uppercase tracking-wide pb-2 border-b border-[#D4CFC7] mb-2">
          <div className="col-span-4">Description</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1 text-right">Parts</div>
          <div className="col-span-1 text-right">Labour</div>
          <div className="col-span-1 text-right">Paint</div>
          <div className="col-span-1 text-right">Other</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-center">Appr.</div>
          <div className="col-span-1" />
        </div>

        <div className="space-y-1">
          {assessment.repair_line_items.map((item) => {
            const total = computeLineItemTotal({
              parts_cost: item.parts_cost,
              labour_cost: item.labour_cost,
              paint_cost: item.paint_cost,
              paint_materials_cost: item.paint_materials_cost,
              strip_assm_cost: item.strip_assm_cost,
              frame_cost: item.frame_cost,
              misc_cost: item.misc_cost,
              qty: item.qty,
              is_approved: item.is_approved,
            })
            const isExpanded = expandedRows.has(item.id)

            return (
              <div key={item.id} className={`border border-[#D4CFC7] rounded-lg overflow-hidden ${!item.is_approved ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
                  <div className="col-span-4 flex items-center gap-2">
                    <button onClick={() => toggleExpand(item.id)} className="text-slate/40 hover:text-slate">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-sm text-charcoal truncate">{item.description}</span>
                    {item.is_sublet && <span className="text-xs bg-slate/10 text-slate px-1.5 py-0.5 rounded">sublet</span>}
                    {item.betterment_applicable && <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{item.betterment_percentage}% better.</span>}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${OP_TYPE_COLORS[item.operation_type]}`}>
                      {OP_TYPE_LABELS[item.operation_type]}
                    </span>
                  </div>
                  <div className="col-span-1 text-right text-xs text-slate">{formatZar(item.parts_cost)}</div>
                  <div className="col-span-1 text-right text-xs text-slate">{formatZar(item.labour_cost)}</div>
                  <div className="col-span-1 text-right text-xs text-slate">{formatZar(item.paint_cost + item.paint_materials_cost)}</div>
                  <div className="col-span-1 text-right text-xs text-slate">{formatZar(item.strip_assm_cost + item.frame_cost + item.misc_cost)}</div>
                  <div className="col-span-1 text-right text-sm font-semibold text-charcoal">{formatZar(total)}</div>
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={item.is_approved}
                      onChange={() => handleToggleApprove(item)}
                      className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => deleteLineItem.mutate(item.id)}
                      className="text-slate/30 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#D4CFC7] bg-[#FAFAF8] px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate">
                    <div><span className="font-medium">Labour Hours:</span> {item.labour_hours}h @ {formatZar(item.labour_rate)}/h</div>
                    <div><span className="font-medium">Paint Materials:</span> {formatZar(item.paint_materials_cost)}</div>
                    <div><span className="font-medium">Strip &amp; Assemble:</span> {formatZar(item.strip_assm_cost)}</div>
                    <div><span className="font-medium">Frame:</span> {formatZar(item.frame_cost)}</div>
                    {item.is_sublet && <div className="col-span-2"><span className="font-medium">Sublet Supplier:</span> {item.sublet_supplier}</div>}
                    {item.notes && <div className="col-span-4"><span className="font-medium">Notes:</span> {item.notes}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showAddRow && (
          <div className="mt-3 border border-copper/30 rounded-lg p-4 bg-copper/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Field label="Description *">
                  <Input value={newItem.description} onChange={(e) => setN('description', e.target.value)} autoFocus placeholder="e.g. Straighten LF door" />
                </Field>
              </div>
              <Field label="Operation Type">
                <Select value={newItem.operation_type} onChange={(e) => setN('operation_type', e.target.value)}>
                  {(Object.keys(OP_TYPE_LABELS) as OperationType[]).map((k) => (
                    <option key={k} value={k}>{OP_TYPE_LABELS[k]}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Field label="Parts (R)">
                <ZarInput value={newItem.parts_cost} onChange={(v) => setN('parts_cost', v)} />
              </Field>
              <Field label="Labour Hours">
                <input type="number" min={0} step={0.5} value={newItem.labour_hours || ''} onChange={(e) => setN('labour_hours', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30" />
              </Field>
              <Field label="Labour Rate (R/h)">
                <ZarInput value={newItem.labour_rate} onChange={(v) => setN('labour_rate', v)} />
              </Field>
              <Field label="Paint (R)">
                <ZarInput value={newItem.paint_cost} onChange={(v) => setN('paint_cost', v)} />
              </Field>
              <Field label="Paint Mat. (R)">
                <ZarInput value={newItem.paint_materials_cost} onChange={(v) => setN('paint_materials_cost', v)} />
              </Field>
              <Field label="Strip/Assm (R)">
                <ZarInput value={newItem.strip_assm_cost} onChange={(v) => setN('strip_assm_cost', v)} />
              </Field>
              <Field label="Misc (R)">
                <ZarInput value={newItem.misc_cost} onChange={(v) => setN('misc_cost', v)} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.is_sublet} onChange={(e) => setN('is_sublet', e.target.checked)} className="w-4 h-4 rounded border-[#D4CFC7] text-copper" />
                <span className="text-sm text-slate">Sublet operation</span>
              </label>
              {newItem.is_sublet && (
                <div className="flex-1 min-w-40">
                  <Input value={newItem.sublet_supplier} onChange={(e) => setN('sublet_supplier', e.target.value)} placeholder="Supplier name" />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.betterment_applicable} onChange={(e) => setN('betterment_applicable', e.target.checked)} className="w-4 h-4 rounded border-[#D4CFC7] text-copper" />
                <span className="text-sm text-slate">Betterment applicable</span>
              </label>
              {newItem.betterment_applicable && (
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={100} value={newItem.betterment_percentage || ''} onChange={(e) => setN('betterment_percentage', parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-[#D4CFC7] rounded text-sm" />
                  <span className="text-sm text-slate">%</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddItem} disabled={createLineItem.isPending || !newItem.description} className="px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90">
                {createLineItem.isPending ? 'Adding...' : 'Add Line Item'}
              </button>
              <button onClick={() => setShowAddRow(false)} className="px-4 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showAddRow && (
          <button onClick={() => setShowAddRow(true)} className="mt-3 flex items-center gap-2 text-sm text-copper hover:opacity-80 font-medium">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        )}

        {assessment.repair_line_items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#D4CFC7] flex flex-col items-end gap-1">
            <div className="flex items-center gap-6">
              <span className="text-sm text-slate">Total Assessed Repair (excl. VAT)</span>
              <span className="text-xl font-bold text-charcoal">{formatZar(grandTotal)}</span>
            </div>
            {maxRepair != null && (
              <div className={`flex items-center gap-2 text-sm font-medium ${isUneconomical ? 'text-red-600' : 'text-emerald-600'}`}>
                {isUneconomical ? '⚠ Uneconomical to repair — exceeds max threshold' : '✓ Within repair threshold'}
                {' '}({formatZar(maxRepair)})
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="flex justify-end pt-2">
        <button onClick={() => onNavigate('parts')} className="px-5 py-2 border border-copper text-copper rounded-lg text-sm font-medium hover:bg-copper/5 transition-colors">
          Parts →
        </button>
      </div>
    </div>
  )
}
