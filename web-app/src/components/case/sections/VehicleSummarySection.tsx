'use client'

import React, { useState } from 'react'
import { Car, AlertCircle, RefreshCw, Plus, Pencil, X, Check } from 'lucide-react'
import { useRiskItems, useCreateRiskItem, useUpdateRiskItem } from '@/hooks/use-risk-items'
import { Field, Input, Select } from '@/components/assessment/shared'
import type { MotorVehicleAssetData, CaseRiskItem } from '@/lib/types/risk-item'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

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

interface VehicleFormState {
  make: string
  model: string
  year: string
  colour: string
  vin: string
  engine_number: string
  registration: string
  odometer_km: string
  transmission: string
  condition: string
}

const emptyForm: VehicleFormState = {
  make: '',
  model: '',
  year: '',
  colour: '',
  vin: '',
  engine_number: '',
  registration: '',
  odometer_km: '',
  transmission: '',
  condition: '',
}

function vehicleItemToForm(item: CaseRiskItem): VehicleFormState {
  const d = (item.asset_data ?? {}) as MotorVehicleAssetData & {
    transmission?: string
    condition?: string
  }
  return {
    make: d.make ?? '',
    model: d.model ?? '',
    year: d.year ? String(d.year) : '',
    colour: d.colour ?? '',
    vin: d.vin ?? '',
    engine_number: d.engine_number ?? '',
    registration: d.registration ?? '',
    odometer_km: d.odometer_km ? String(d.odometer_km) : '',
    transmission: d.transmission ?? '',
    condition: d.condition ?? '',
  }
}

function formToAssetData(form: VehicleFormState) {
  return {
    make: form.make || undefined,
    model: form.model || undefined,
    year: form.year ? parseInt(form.year, 10) : undefined,
    colour: form.colour || undefined,
    vin: form.vin || undefined,
    engine_number: form.engine_number || undefined,
    registration: form.registration || undefined,
    odometer_km: form.odometer_km ? parseInt(form.odometer_km, 10) : undefined,
    transmission: form.transmission || undefined,
    condition: form.condition || undefined,
  }
}

function VehicleForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  saveError,
}: {
  form: VehicleFormState
  onChange: (f: VehicleFormState) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  saveError: boolean
}) {
  function set(key: keyof VehicleFormState, value: string) {
    onChange({ ...form, [key]: value })
  }
  return (
    <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Make"><Input value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="e.g. Toyota" /></Field>
        <Field label="Model"><Input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Corolla" /></Field>
        <Field label="Year"><Input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="e.g. 2020" min={1900} max={new Date().getFullYear() + 1} /></Field>
        <Field label="Colour"><Input value={form.colour} onChange={(e) => set('colour', e.target.value)} placeholder="e.g. White" /></Field>
        <Field label="VIN"><Input value={form.vin} onChange={(e) => set('vin', e.target.value)} placeholder="17-character VIN" /></Field>
        <Field label="Engine Number"><Input value={form.engine_number} onChange={(e) => set('engine_number', e.target.value)} placeholder="Engine / motor number" /></Field>
        <Field label="Registration"><Input value={form.registration} onChange={(e) => set('registration', e.target.value)} placeholder="e.g. CA 123-456" /></Field>
        <Field label="Odometer (km)"><Input type="number" value={form.odometer_km} onChange={(e) => set('odometer_km', e.target.value)} placeholder="e.g. 85000" min={0} /></Field>
        <Field label="Transmission">
          <Select value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
            <option value="">— Select —</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
            <option value="cvt">CVT</option>
            <option value="semi_automatic">Semi-Automatic</option>
          </Select>
        </Field>
        <Field label="General Condition (pre-loss)">
          <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
            <option value="">— Select —</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        {saveError && <span className="text-xs text-red-600 ml-2">Save failed. Please try again.</span>}
      </div>
    </div>
  )
}

export function VehicleSummarySection({ caseId }: SectionProps) {
  const { data: riskItems, isLoading, isError, refetch } = useRiskItems(caseId)
  const createRiskItem = useCreateRiskItem()
  const updateRiskItem = useUpdateRiskItem(caseId)

  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<VehicleFormState>(emptyForm)

  const vehicle = riskItems?.find((item) => item.risk_type === 'motor_vehicle') ?? null
  const assetData = vehicle ? ((vehicle.asset_data ?? {}) as MotorVehicleAssetData & { transmission?: string; condition?: string }) : null

  function startEdit() {
    if (!vehicle) return
    setForm(vehicleItemToForm(vehicle))
    setEditing(true)
  }

  function startAdd() {
    setForm(emptyForm)
    setAdding(true)
  }

  async function handleSave() {
    if (vehicle) {
      await updateRiskItem.mutateAsync({ riskItemId: vehicle.id, updates: { asset_data: formToAssetData(form) } })
      setEditing(false)
    } else {
      await createRiskItem.mutateAsync({
        case_id: caseId,
        risk_type: 'motor_vehicle',
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
          <Car className="w-4 h-4" />
          <span className="text-sm">Vehicle summary</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Car className="w-4 h-4" />
          <span className="text-sm">Vehicle summary</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load vehicle details.</p>
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
          <Car className="w-4 h-4" />
          <span className="text-sm">Vehicle summary</span>
        </div>
        {vehicle && !editing && (
          <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {!vehicle && !adding && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <Car className="w-8 h-8 text-[#D4CFC7] mx-auto" />
          <p className="text-sm text-slate">No vehicle risk item added yet.</p>
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> Add Vehicle
          </button>
        </div>
      )}

      {adding && (
        <VehicleForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => { setAdding(false); setForm(emptyForm) }}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}

      {vehicle && !editing && (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] px-4 py-1">
          <DetailRow label="Make" value={assetData?.make} />
          <DetailRow label="Model" value={assetData?.model} />
          <DetailRow label="Year" value={assetData?.year} />
          <DetailRow label="Colour" value={assetData?.colour} />
          <DetailRow label="VIN" value={assetData?.vin} />
          <DetailRow label="Engine Number" value={assetData?.engine_number} />
          <DetailRow label="Registration" value={assetData?.registration} />
          <DetailRow label="Odometer" value={assetData?.odometer_km != null ? `${assetData.odometer_km.toLocaleString()} km` : null} />
          <DetailRow label="Transmission" value={assetData?.transmission} />
          <DetailRow label="Condition (pre-loss)" value={assetData?.condition} />
        </div>
      )}

      {vehicle && editing && (
        <VehicleForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => { setEditing(false); setForm(emptyForm) }}
          isSaving={isSaving}
          saveError={saveError}
        />
      )}
    </div>
  )
}
