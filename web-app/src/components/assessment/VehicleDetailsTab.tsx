'use client'

import { useState } from 'react'
import { useUpsertVehicleDetails } from '@/hooks/use-assessments'
import { Field, Section, Input, Select, Textarea, SaveBar } from './shared'
import type { FullMotorAssessment } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

const DAMAGE_DIRECTIONS = [
  { value: '', label: 'Select direction…' },
  { value: 'front', label: 'Front' },
  { value: 'rear', label: 'Rear' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'rollover', label: 'Rollover' },
  { value: 'multiple', label: 'Multiple' },
  { value: 'underbody', label: 'Underbody' },
]

export function VehicleDetailsTab({ assessment, onNavigate }: Props) {
  const upsertVehicle = useUpsertVehicleDetails(assessment.id)
  const [saved, setSaved] = useState(false)
  const v = assessment.vehicle_details

  const [form, setForm] = useState({
    make: v?.make ?? '',
    model: v?.model ?? '',
    year_model: v?.year_model?.toString() ?? '',
    reg_number: v?.reg_number ?? '',
    vin_number: v?.vin_number ?? '',
    engine_number: v?.engine_number ?? '',
    mileage: v?.mileage?.toString() ?? '',
    mileage_unknown: v?.mileage_unknown ?? false,
    mm_code: v?.mm_code ?? '',
    transmission: v?.transmission ?? '',
    colour: v?.colour ?? '',
    windscreen: v?.windscreen ?? 'intact',
    wheels: v?.wheels ?? 'factory',
    spare_wheel: v?.spare_wheel ?? 'unknown',
    air_conditioning: v?.air_conditioning ?? 'unknown',
    radio: v?.radio ?? 'unknown',
    brakes: v?.brakes ?? 'unknown',
    damage_direction: v?.damage_direction ?? '',
    damage_description: v?.damage_description ?? '',
    vehicle_notes: v?.vehicle_notes ?? '',
  })

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    await upsertVehicle.mutateAsync({
      ...form,
      year_model: form.year_model ? parseInt(form.year_model) : undefined,
      mileage: form.mileage_unknown ? null : (form.mileage ? parseInt(form.mileage) : undefined),
      damage_direction: form.damage_direction as any || undefined,
    })
    setSaved(true)
  }

  return (
    <div className="space-y-5">
      <Section title="Vehicle Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Make" required>
            <Input value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="Toyota, BMW…" />
          </Field>
          <Field label="Model" required>
            <Input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Corolla, 3 Series…" />
          </Field>
          <Field label="Year Model">
            <Input type="number" value={form.year_model} onChange={(e) => set('year_model', e.target.value)} placeholder="2022" min={1900} max={2100} />
          </Field>
          <Field label="Registration Number">
            <Input value={form.reg_number} onChange={(e) => set('reg_number', e.target.value)} className="uppercase" />
          </Field>
          <Field label="VIN Number">
            <Input value={form.vin_number} onChange={(e) => set('vin_number', e.target.value)} className="uppercase" />
          </Field>
          <Field label="Engine Number">
            <Input value={form.engine_number} onChange={(e) => set('engine_number', e.target.value)} />
          </Field>
          <Field label="MM Code">
            <Input value={form.mm_code} onChange={(e) => set('mm_code', e.target.value)} placeholder="e.g. 4085" />
          </Field>
          <Field label="Transmission">
            <Select value={form.transmission} onChange={(e) => set('transmission', e.target.value)}>
              <option value="">Unknown</option>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic</option>
              <option value="CVT">CVT</option>
              <option value="DSG">DSG / DCT</option>
            </Select>
          </Field>
          <Field label="Colour">
            <Input value={form.colour} onChange={(e) => set('colour', e.target.value)} placeholder="White, Silver…" />
          </Field>
        </div>
      </Section>

      <Section title="Mileage">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Field label="Odometer Reading (km)">
              <Input
                type="number"
                value={form.mileage}
                onChange={(e) => set('mileage', e.target.value)}
                disabled={form.mileage_unknown}
                placeholder="e.g. 87500"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.mileage_unknown}
              onChange={(e) => set('mileage_unknown', e.target.checked)}
              className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
            />
            <span className="text-sm text-slate">Not legible / unknown</span>
          </label>
        </div>
      </Section>

      <Section title="Vehicle Condition">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <Field label="Windscreen">
            <Select value={form.windscreen} onChange={(e) => set('windscreen', e.target.value)}>
              <option value="intact">Intact</option>
              <option value="cracked">Cracked</option>
              <option value="damaged">Damaged</option>
            </Select>
          </Field>
          <Field label="Wheels">
            <Select value={form.wheels} onChange={(e) => set('wheels', e.target.value)}>
              <option value="factory">Factory</option>
              <option value="alloy">Alloy</option>
              <option value="aftermarket">Aftermarket</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="Spare Wheel">
            <Select value={form.spare_wheel} onChange={(e) => set('spare_wheel', e.target.value)}>
              <option value="factory_fitted">Factory</option>
              <option value="aftermarket">Aftermarket</option>
              <option value="none">None</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="A/C">
            <Select value={form.air_conditioning} onChange={(e) => set('air_conditioning', e.target.value)}>
              <option value="factory_fitted">Factory</option>
              <option value="aftermarket">Aftermarket</option>
              <option value="none">None</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="Radio">
            <Select value={form.radio} onChange={(e) => set('radio', e.target.value)}>
              <option value="factory_fitted">Factory</option>
              <option value="aftermarket">Aftermarket</option>
              <option value="none">None</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="Brakes">
            <Select value={form.brakes} onChange={(e) => set('brakes', e.target.value)}>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="worn">Worn</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
        </div>
        <Field label="Additional Vehicle Notes">
          <textarea
            value={form.vehicle_notes}
            onChange={(e) => set('vehicle_notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors resize-none"
            placeholder="Any other relevant observations…"
          />
        </Field>
      </Section>

      <Section title="Damage Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary Damage Direction">
            <Select value={form.damage_direction} onChange={(e) => set('damage_direction', e.target.value)}>
              {DAMAGE_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-1">
            <Field label="Damage Description">
              <textarea
                value={form.damage_description}
                onChange={(e) => set('damage_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors resize-none"
                placeholder="Brief description of damage…"
              />
            </Field>
          </div>
        </div>
      </Section>

      <SaveBar
        onSave={handleSave}
        isSaving={upsertVehicle.isPending}
        saved={saved}
        onNext={() => onNavigate('tyres')}
        nextLabel="Tyres"
      />
    </div>
  )
}
