/**
 * Organisation specialisation settings
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type OrgSpecialisation =
  | 'motor_assessor'
  | 'property_assessor'
  | 'loss_adjuster'
  | 'investigator'
  | 'general'

const SPECIALISATION_OPTIONS: { value: OrgSpecialisation; label: string; description: string }[] = [
  { value: 'motor_assessor', label: 'Motor Assessor', description: 'Assess motor vehicle damage claims' },
  { value: 'property_assessor', label: 'Property Assessor', description: 'Assess building and property damage' },
  { value: 'loss_adjuster', label: 'Loss Adjuster', description: 'Adjust losses across multiple verticals' },
  { value: 'investigator', label: 'Investigator', description: 'Investigate insurance fraud and claims' },
  { value: 'general', label: 'General / All', description: 'All risk types and verticals' },
]

export default function SpecialisationSettingsPage() {
  const [selected, setSelected] = useState<OrgSpecialisation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/org/specialisations')
      .then((r) => r.json())
      .then((data) => {
        setSelected(data.specialisations || [])
      })
      .catch((err) => {
        console.error('Failed to load specialisations:', err)
        setFetchError('Failed to load specialisation settings.')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleSpec = (spec: OrgSpecialisation) => {
    setSelected((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/org/specialisations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialisations: selected }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
    } catch (err: any) {
      alert(err.message || 'Failed to save specialisations')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/app/settings"
        className="text-sm text-muted hover:text-slate mb-6 inline-block"
      >
        Back to Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Specialisations</h1>
        <p className="text-slate mt-1">
          Select what your organisation specialises in. This determines which risk types and fields are available when creating cases.
        </p>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 max-w-2xl">
            {SPECIALISATION_OPTIONS.map((opt) => {
              const isActive = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleSpec(opt.value)}
                  className={`w-full text-left p-5 border rounded-lg transition-all ${
                    isActive
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                      : 'border-[#D4CFC7] bg-white hover:border-[#C9C4BC]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isActive ? 'border-accent bg-accent' : 'border-[#D4CFC7]'
                      }`}
                    >
                      {isActive && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">{opt.label}</p>
                      <p className="text-sm text-muted mt-0.5">{opt.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Specialisations'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Saved successfully</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
