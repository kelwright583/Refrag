'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Building2, Wrench, Package } from 'lucide-react'
import {
  useAssessmentSettings,
  useUpdateAssessmentSettings,
  useApprovedRepairers,
  useCreateApprovedRepairer,
  useDeleteApprovedRepairer,
  usePreferredSuppliers,
  useCreatePreferredSupplier,
  useDeletePreferredSupplier,
} from '@/hooks/use-assessments'
import { Field, Section, Input, ZarInput } from '@/components/assessment/shared'

const LABOUR_RATE_FIELDS = [
  { key: 'labour_rate_panel', label: 'Panel Beating' },
  { key: 'labour_rate_mechanical', label: 'Mechanical' },
  { key: 'labour_rate_electrical', label: 'Electrical' },
  { key: 'labour_rate_paint', label: 'Paint' },
  { key: 'labour_rate_structural', label: 'Structural' },
  { key: 'labour_rate_trim', label: 'Trim' },
  { key: 'labour_rate_glass', label: 'Glass' },
] as const

export default function AssessmentSettingsPage() {
  const router = useRouter()
  const { data: settings, isLoading } = useAssessmentSettings()
  const updateSettings = useUpdateAssessmentSettings()
  const { data: repairers } = useApprovedRepairers()
  const createRepairer = useCreateApprovedRepairer()
  const deleteRepairer = useDeleteApprovedRepairer()
  const { data: suppliers } = usePreferredSuppliers()
  const createSupplier = useCreatePreferredSupplier()
  const deleteSupplier = useDeletePreferredSupplier()

  const [settingsSaved, setSettingsSaved] = useState(false)

  const [form, setForm] = useState<Record<string, any>>({
    vat_rate: 15,
    max_repair_percentage: 75,
    parts_handling_fee_percentage: 0,
    labour_rate_panel: 0,
    labour_rate_mechanical: 0,
    labour_rate_electrical: 0,
    labour_rate_paint: 0,
    labour_rate_structural: 0,
    labour_rate_trim: 0,
    labour_rate_glass: 0,
    company_registration: '',
    vat_registration: '',
    report_disclaimer: '',
    without_prejudice_default: true,
  })

  // Sync settings into form when loaded (only on first load)
  const [formInitialized, setFormInitialized] = useState(false)
  if (settings && !formInitialized) {
    setForm({
      vat_rate: settings.vat_rate ?? 15,
      max_repair_percentage: settings.max_repair_percentage ?? 75,
      parts_handling_fee_percentage: settings.parts_handling_fee_percentage ?? 0,
      labour_rate_panel: settings.labour_rate_panel ?? 0,
      labour_rate_mechanical: settings.labour_rate_mechanical ?? 0,
      labour_rate_electrical: settings.labour_rate_electrical ?? 0,
      labour_rate_paint: settings.labour_rate_paint ?? 0,
      labour_rate_structural: settings.labour_rate_structural ?? 0,
      labour_rate_trim: settings.labour_rate_trim ?? 0,
      labour_rate_glass: settings.labour_rate_glass ?? 0,
      company_registration: settings.company_registration ?? '',
      vat_registration: settings.vat_registration ?? '',
      report_disclaimer: settings.report_disclaimer ?? '',
      without_prejudice_default: settings.without_prejudice_default ?? true,
    })
    setFormInitialized(true)
  }

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSettingsSaved(false)
  }

  const handleSave = async () => {
    await updateSettings.mutateAsync(form as any)
    setSettingsSaved(true)
  }

  // New repairer form
  const [newRepairer, setNewRepairer] = useState({ name: '', contact_number: '', email: '', address: '' })
  const [showAddRepairer, setShowAddRepairer] = useState(false)
  const handleAddRepairer = async () => {
    if (!newRepairer.name) return
    await createRepairer.mutateAsync(newRepairer)
    setNewRepairer({ name: '', contact_number: '', email: '', address: '' })
    setShowAddRepairer(false)
  }

  // New supplier form
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_number: '', email: '', notes: '' })
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const handleAddSupplier = async () => {
    if (!newSupplier.name) return
    await createSupplier.mutateAsync(newSupplier)
    setNewSupplier({ name: '', contact_number: '', email: '', notes: '' })
    setShowAddSupplier(false)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/app/settings')}
        className="flex items-center gap-2 text-slate hover:text-charcoal mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <h1 className="text-2xl font-heading font-bold text-charcoal mb-6">Assessment Settings</h1>

      <div className="space-y-5">
        {/* Org Branding for Reports */}
        <Section title="Organisation Branding">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Registration Number">
              <Input value={form.company_registration} onChange={(e) => set('company_registration', e.target.value)} placeholder="e.g. 2019/123456/07" />
            </Field>
            <Field label="VAT Registration Number">
              <Input value={form.vat_registration} onChange={(e) => set('vat_registration', e.target.value)} placeholder="e.g. 4123456789" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Report Disclaimer (appears at bottom of every report)">
              <textarea
                value={form.report_disclaimer}
                onChange={(e) => set('report_disclaimer', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper resize-none"
                placeholder="This report is issued without prejudice…"
              />
            </Field>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.without_prejudice_default}
                onChange={(e) => set('without_prejudice_default', e.target.checked)}
                className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
              />
              <span className="text-sm text-charcoal">Mark all reports "Without Prejudice" by default</span>
            </label>
          </div>
        </Section>

        {/* Calculation Defaults */}
        <Section title="Calculation Defaults">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="VAT Rate (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.vat_rate}
                onChange={(e) => set('vat_rate', parseFloat(e.target.value) || 15)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30"
              />
            </Field>
            <Field label="Max Repair Threshold (% of retail)">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.max_repair_percentage}
                onChange={(e) => set('max_repair_percentage', parseFloat(e.target.value) || 75)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30"
              />
            </Field>
            <Field label="Parts Handling Fee (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.parts_handling_fee_percentage}
                onChange={(e) => set('parts_handling_fee_percentage', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30"
              />
            </Field>
          </div>
        </Section>

        {/* Labour Rates */}
        <Section title="Default Labour Rates (R / hour)">
          <p className="text-xs text-slate mb-4">These rates are applied automatically when adding repair line items. Overrideable per line item.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {LABOUR_RATE_FIELDS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <ZarInput value={form[key]} onChange={(v) => set(key, v)} />
              </Field>
            ))}
          </div>
        </Section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="px-6 py-2.5 bg-copper text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {updateSettings.isPending ? 'Saving...' : settingsSaved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>

        {/* Approved Repairers */}
        <Section title="Approved Panel Repairers">
          <div className="space-y-2 mb-4">
            {(repairers ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border border-[#D4CFC7] rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate/50 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">{r.name}</p>
                    {(r.contact_number || r.email) && (
                      <p className="text-xs text-slate">{[r.contact_number, r.email].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteRepairer.mutate(r.id)} className="text-slate/30 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {showAddRepairer ? (
            <div className="border border-copper/30 rounded-lg p-4 bg-copper/5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Repairer Name *">
                  <Input value={newRepairer.name} onChange={(e) => setNewRepairer({ ...newRepairer, name: e.target.value })} autoFocus />
                </Field>
                <Field label="Contact Number">
                  <Input value={newRepairer.contact_number} onChange={(e) => setNewRepairer({ ...newRepairer, contact_number: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={newRepairer.email} onChange={(e) => setNewRepairer({ ...newRepairer, email: e.target.value })} />
                </Field>
                <Field label="Address">
                  <Input value={newRepairer.address} onChange={(e) => setNewRepairer({ ...newRepairer, address: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddRepairer} disabled={createRepairer.isPending || !newRepairer.name} className="px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {createRepairer.isPending ? 'Adding...' : 'Add Repairer'}
                </button>
                <button onClick={() => setShowAddRepairer(false)} className="px-4 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddRepairer(true)} className="flex items-center gap-2 text-sm text-copper hover:opacity-80 font-medium">
              <Plus className="w-4 h-4" /> Add Repairer
            </button>
          )}
        </Section>

        {/* Preferred Parts Suppliers */}
        <Section title="Preferred Parts Suppliers">
          <div className="space-y-2 mb-4">
            {(suppliers ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 border border-[#D4CFC7] rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate/50 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">{s.name}</p>
                    {(s.contact_number || s.email) && (
                      <p className="text-xs text-slate">{[s.contact_number, s.email].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteSupplier.mutate(s.id)} className="text-slate/30 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {showAddSupplier ? (
            <div className="border border-copper/30 rounded-lg p-4 bg-copper/5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Supplier Name *">
                  <Input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} autoFocus />
                </Field>
                <Field label="Contact Number">
                  <Input value={newSupplier.contact_number} onChange={(e) => setNewSupplier({ ...newSupplier, contact_number: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
                </Field>
                <Field label="Notes">
                  <Input value={newSupplier.notes} onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddSupplier} disabled={createSupplier.isPending || !newSupplier.name} className="px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {createSupplier.isPending ? 'Adding...' : 'Add Supplier'}
                </button>
                <button onClick={() => setShowAddSupplier(false)} className="px-4 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSupplier(true)} className="flex items-center gap-2 text-sm text-copper hover:opacity-80 font-medium">
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          )}
        </Section>
      </div>
    </div>
  )
}
