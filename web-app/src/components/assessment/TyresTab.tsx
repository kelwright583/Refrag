'use client'

import { useState } from 'react'
import { useUpsertTyreDetails } from '@/hooks/use-assessments'
import { Field, Section, Input, Select } from './shared'
import type { FullMotorAssessment, TyrePosition } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

const TYRE_POSITIONS: { pos: TyrePosition; label: string }[] = [
  { pos: 'RF', label: 'Right Front' },
  { pos: 'LF', label: 'Left Front' },
  { pos: 'RR', label: 'Right Rear' },
  { pos: 'LR', label: 'Left Rear' },
]

export function TyresTab({ assessment, onNavigate }: Props) {
  const upsertTyres = useUpsertTyreDetails(assessment.id)

  const [tyreSaved, setTyreSaved] = useState(false)
  const buildInitialTyres = () =>
    TYRE_POSITIONS.reduce((acc, { pos }) => {
      const existing = assessment.tyre_details.find((t) => t.position === pos)
      acc[pos] = {
        make: existing?.make ?? '',
        size: existing?.size ?? '',
        tread_mm: existing?.tread_mm?.toString() ?? '',
        condition: existing?.condition ?? 'unknown',
        comments: existing?.comments ?? '',
      }
      return acc
    }, {} as Record<TyrePosition, { make: string; size: string; tread_mm: string; condition: string; comments: string }>)

  const [tyres, setTyres] = useState(buildInitialTyres)

  const setTyre = (pos: TyrePosition, key: string, value: string) => {
    setTyres((t) => ({ ...t, [pos]: { ...t[pos], [key]: value } }))
    setTyreSaved(false)
  }

  const handleSaveTyres = async () => {
    const items = TYRE_POSITIONS.map(({ pos }) => ({
      position: pos,
      make: tyres[pos].make || undefined,
      size: tyres[pos].size || undefined,
      tread_mm: tyres[pos].tread_mm ? parseFloat(tyres[pos].tread_mm) : undefined,
      condition: tyres[pos].condition as any,
      comments: tyres[pos].comments || undefined,
    }))
    await upsertTyres.mutateAsync(items)
    setTyreSaved(true)
  }

  return (
    <div className="space-y-5">
      <Section title="Tyre Condition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TYRE_POSITIONS.map(({ pos, label }) => (
            <div key={pos} className="border border-[#D4CFC7] rounded-lg p-4">
              <h4 className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-3">{label}</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Make">
                  <Input value={tyres[pos].make} onChange={(e) => setTyre(pos, 'make', e.target.value)} placeholder="Bridgestone…" />
                </Field>
                <Field label="Size">
                  <Input value={tyres[pos].size} onChange={(e) => setTyre(pos, 'size', e.target.value)} placeholder="205/60R16" />
                </Field>
                <Field label="Tread (mm)">
                  <Input type="number" min={0} max={20} step={0.5} value={tyres[pos].tread_mm} onChange={(e) => setTyre(pos, 'tread_mm', e.target.value)} />
                </Field>
                <Field label="Condition">
                  <Select value={tyres[pos].condition} onChange={(e) => setTyre(pos, 'condition', e.target.value)}>
                    <option value="good">Good</option>
                    <option value="worn">Worn</option>
                    <option value="damaged">Damaged</option>
                    <option value="unknown">Unknown</option>
                  </Select>
                </Field>
                <div className="col-span-2">
                  <Field label="Comments">
                    <Input value={tyres[pos].comments} onChange={(e) => setTyre(pos, 'comments', e.target.value)} placeholder="Optional notes…" />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-[#D4CFC7]">
          <button
            onClick={handleSaveTyres}
            disabled={upsertTyres.isPending}
            className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {upsertTyres.isPending ? 'Saving...' : tyreSaved ? '✓ Tyres Saved' : 'Save Tyres'}
          </button>
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onNavigate('damages')}
          className="px-5 py-2 border border-copper text-copper rounded-lg text-sm font-medium hover:bg-copper/5 transition-colors"
        >
          Damages / Labour →
        </button>
      </div>
    </div>
  )
}
