'use client'

import React, { useState } from 'react'
import { Building2, AlertCircle, RefreshCw, Plus, Pencil, X, Check } from 'lucide-react'
import { useRiskItems, useCreateRiskItem, useUpdateRiskItem } from '@/hooks/use-risk-items'
import { Field, Input, Select, Textarea, CurrencyInput } from '@/components/assessment/shared'
import type { BuildingAssetData, CaseRiskItem, RiskType } from '@/lib/types/risk-item'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

const PROPERTY_RISK_TYPES: RiskType[] = ['building', 'contents', 'stock', 'business_interruption']

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-[#D4CFC7]">
          <div className="h-3 w-28 bg-[#D4CFC7] rounded" />
          <div className="h-4 w-36 bg-[#D4CFC7] rounded" />
        </div>
      ))}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#D4CFC7] last:border-0">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-charcoal font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

interface PropertyFormState {
  risk_type: RiskType
  address: string
  erf_number: string
  property_type: string
  construction_type: string
  roof_type: string
  sum_insured_building: string
  sum_insured_contents: string
  year_built: string
  occupancy_status: string
}

const emptyForm: PropertyFormState = {
  risk_type: 'building',
  address: '',
  erf_number: '',
  property_type: '',
  construction_type: '',
  roof_type: '',
  sum_insured_building: '',
  sum_insured_contents: '',
  year_built: '',
  occupancy_status: '',
}

function propertyItemToForm(item: CaseRiskItem): PropertyFormState {
  const d = (item.asset_data ?? {}) as BuildingAssetData & {
    roof_type?: string
    sum_insured_building?: number
    sum_insured_contents?: number
    year_built?: number
    occupancy_status?: string
  }
  return {
    risk_type: item.risk_type as RiskType,
    address: d.address ?? '',
    erf_number: d.erf_number ?? '',
    property_type: d.property_type ?? '',
    construction_type: d.construction_type ?? '',
    roof_type: d.roof_type ?? '',
    sum_insured_building: d.sum_insured_building ? String(d.sum_insured_building) : '',
    sum_insured_contents: d.sum_insured_contents ? String(d.sum_insured_contents) : '',
    year_built: d.year_built ? String(d.year_built) : '',
    occupancy_status: d.occupancy_status ?? '',
  }
}

function formToAssetData(form: PropertyFormState) {
  return {
    address: form.address || undefined,
    erf_number: form.erf_number || undefined,
    property_type: form.property_type || undefined,
    construction_type: form.construction_type || undefined,
    roof_type: form.roof_type || undefined,
    sum_insured_building: form.sum_insured_building ? parseFloat(form.sum_insured_building) : undefined,
    sum_insured_contents: form.sum_insured_contents ? parseFloat(form.sum_insured_contents) : undefined,
    year_built: form.year_built ? parseInt(form.year_built, 10) : undefined,
    occupancy_status: form.occupancy_status || undefined,
  }
}

function formatCurrency(value: number | undefined): string {
  if (value == null) return ''
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value)
}

function PropertyForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  saveError,
  isNew,
}: {
  form: PropertyFormState
  onChange: (f: PropertyFormState) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  saveError: boolean
  isNew: boolean
}) {
  function set(key: keyof PropertyFormState, value: string) {
    onChange({ ...form, [key]: value })
  }
  return (
    <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isNew && (
          <Field label="Risk Type">
            <Select value={form.risk_type} onChange={(e) => set('risk_type', e.target.value as RiskType)}>
              <option value="building">Building</option>
              <option value="contents">Contents</option>
              <option value="stock">Stock</option>
              <option value="business_interruption">Business Interruption</option>
            </Select>
          </Field>
        )}
        <Field label="Property Address">
          <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full property address" />
        </Field>
        <Field label="Erf / Stand Number">
          <Input value={form.erf_number} onChange={(e) => set('erf_number', e.target.value)} placeholder="e.g. Erf 1234" />
        </Field>
        <Field label="Property Type">
          <Select value={form.property_type} onChange={(e) => set('property_type', e.target.value)}>
            <option value="">— Select —</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Construction Type">
          <Select value={form.construction_type} onChange={(e) => set('construction_type', e.target.value)}>
            <option value="">— Select —</option>
            <option value="brick">Brick</option>
            <option value="timber">Timber</option>
            <option value="steel_frame">Steel Frame</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Roof Type">
          <Input value={form.roof_type} onChange={(e) => set('roof_type', e.target.value)} placeholder="e.g. IBR Sheeting" />
        </Field>
        <Field label="Sum Insured — Building (R)">
          <CurrencyInput
            currencySymbol="R"
            value={form.sum_insured_building ? parseFloat(form.sum_insured_building) : 0}
            onChange={(v) => set('sum_insured_building', v ? String(v) : '')}
          />
        </Field>
        <Field label="Sum Insured — Contents (R)">
          <CurrencyInput
            currencySymbol="R"
            value={form.sum_insured_contents ? parseFloat(form.sum_insured_contents) : 0}
            onChange={(v) => set('sum_insured_contents', v ? String(v) : '')}
          />
        </Field>
        <Field label="Year Built">
          <Input type="number" value={form.year_built} onChange={(e) => set('year_built', e.target.value)} placeholder="e.g. 1998" min={1800} max={new Date().getFullYear()} />
        </Field>
        <Field label="Occupancy at Time of Loss">
          <Select value={form.occupancy_status} onChange={(e) => set('occupancy_status', e.target.value)}>
            <option value="">— Select —</option>
            <option value="occupied">Occupied</option>
            <option value="unoccupied">Unoccupied</option>
            <option value="partially_occupied">Partially Occupied</option>
            <option value="vacant">Vacant</option>
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
        <button onClick={onSave} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Check className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        {saveError && <span className="text-xs text-red-600 ml-2">Save failed. Please try again.</span>}
      </div>
    </div>
  )
}

export function PropertySummarySection({ caseId }: SectionProps) {
  const { data: riskItems, isLoading, isError, refetch } = useRiskItems(caseId)
  const createRiskItem = useCreateRiskItem()
  const updateRiskItem = useUpdateRiskItem(caseId)

  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<PropertyFormState>(emptyForm)

  const propertyItem = riskItems?.find((item) => PROPERTY_RISK_TYPES.includes(item.risk_type as RiskType)) ?? null
  const assetData = propertyItem
    ? ((propertyItem.asset_data ?? {}) as BuildingAssetData & {
        roof_type?: string
        sum_insured_building?: number
        sum_insured_contents?: number
        year_built?: number
        occupancy_status?: string
      })
    : null

  function startEdit() {
    if (!propertyItem) return
    setForm(propertyItemToForm(propertyItem))
    setEditing(true)
  }

  function startAdd() {
    setForm(emptyForm)
    setAdding(true)
  }

  async function handleSave() {
    if (propertyItem) {
      await updateRiskItem.mutateAsync({ riskItemId: propertyItem.id, updates: { asset_data: formToAssetData(form) } })
      setEditing(false)
    } else {
      await createRiskItem.mutateAsync({
        case_id: caseId,
        risk_type: form.risk_type,
        is_primary: true,
        asset_data: formToAssetData(form),
      })
      setAdding(false)
    }
    setForm(emptyForm)
  }

  const isSaving = createRiskItem.isPending || updateRiskItem.isPending
  const saveError = createRiskItem.isError || updateRiskItem.isError

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">Property summary</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">Property summary</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load property details.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">Property summary</span>
        </div>
        {propertyItem && !editing && (
          <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {!propertyItem && !adding && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <Building2 className="w-8 h-8 text-[#D4CFC7] mx-auto" />
          <p className="text-sm text-slate">No property risk item added yet.</p>
          <button onClick={startAdd} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Add Property
          </button>
        </div>
      )}

      {adding && (
        <PropertyForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => { setAdding(false); setForm(emptyForm) }}
          isSaving={isSaving}
          saveError={saveError}
          isNew={true}
        />
      )}

      {propertyItem && !editing && (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] px-4 py-1">
          <DetailRow label="Property Address" value={assetData?.address} />
          <DetailRow label="Erf / Stand Number" value={assetData?.erf_number} />
          <DetailRow label="Property Type" value={assetData?.property_type} />
          <DetailRow label="Construction Type" value={assetData?.construction_type} />
          <DetailRow label="Roof Type" value={assetData?.roof_type} />
          <DetailRow label="Sum Insured (Building)" value={assetData?.sum_insured_building ? formatCurrency(assetData.sum_insured_building) : null} />
          <DetailRow label="Sum Insured (Contents)" value={assetData?.sum_insured_contents ? formatCurrency(assetData.sum_insured_contents) : null} />
          <DetailRow label="Year Built" value={assetData?.year_built} />
          <DetailRow label="Occupancy at Loss" value={assetData?.occupancy_status} />
        </div>
      )}

      {propertyItem && editing && (
        <PropertyForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => { setEditing(false); setForm(emptyForm) }}
          isSaving={isSaving}
          saveError={saveError}
          isNew={false}
        />
      )}
    </div>
  )
}
