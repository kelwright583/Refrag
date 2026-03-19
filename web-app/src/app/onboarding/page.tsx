'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Upload,
  Palette,
  DollarSign,
  Wrench,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

const STEPS = [
  { id: 1, title: 'Organisation Details', icon: Building2 },
  { id: 2, title: 'Logo & Branding', icon: Palette },
  { id: 3, title: 'Financial Defaults', icon: DollarSign },
  { id: 4, title: 'Approved Repairers', icon: Wrench },
  { id: 5, title: 'Complete', icon: CheckCircle2 },
]

const LABOUR_RATE_FIELDS = [
  { key: 'labour_rate_panel', label: 'Panel Beating' },
  { key: 'labour_rate_mechanical', label: 'Mechanical' },
  { key: 'labour_rate_electrical', label: 'Electrical' },
  { key: 'labour_rate_paint', label: 'Paint' },
  { key: 'labour_rate_structural', label: 'Structural' },
  { key: 'labour_rate_trim', label: 'Trim' },
  { key: 'labour_rate_glass', label: 'Glass' },
] as const

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

interface OrgProfile {
  id: string
  name: string | null
  legal_name: string | null
  registration_number: string | null
  vat_number: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  logo_url: string | null
  onboarding_completed_at: string | null
}

interface AssessmentSettings {
  vat_rate: number
  max_repair_percentage: number
  parts_handling_fee_percentage: number
  [key: string]: any
}

interface Repairer {
  id: string
  name: string
  contact_number: string
  email: string
  address: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Step 1: Org profile
  const [orgName, setOrgName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')

  // Step 2: Logo & Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [primaryColour, setPrimaryColour] = useState('#C9663D')
  const [accentColour, setAccentColour] = useState('#1A1A2E')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Financial defaults
  const [vatRate, setVatRate] = useState(15)
  const [maxRepairPercentage, setMaxRepairPercentage] = useState(75)
  const [partsHandlingFee, setPartsHandlingFee] = useState(0)
  const [labourRates, setLabourRates] = useState<Record<string, number>>({
    labour_rate_panel: 0,
    labour_rate_mechanical: 0,
    labour_rate_electrical: 0,
    labour_rate_paint: 0,
    labour_rate_structural: 0,
    labour_rate_trim: 0,
    labour_rate_glass: 0,
  })

  // Step 4: Repairers
  const [repairers, setRepairers] = useState<Repairer[]>([])
  const [newRepairer, setNewRepairer] = useState({ name: '', contact_number: '', email: '' })

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, settingsRes, repairersRes] = await Promise.all([
          fetch('/api/org/profile'),
          fetch('/api/settings/assessment'),
          fetch('/api/settings/assessment/repairers'),
        ])

        if (profileRes.ok) {
          const profile: OrgProfile = await profileRes.json()
          setOrgName(profile.name || '')
          setLegalName(profile.legal_name || '')
          setRegistrationNumber(profile.registration_number || '')
          setVatNumber(profile.vat_number || '')
          setContactEmail(profile.contact_email || '')
          setContactPhone(profile.contact_phone || '')
          setAddress(profile.address || '')
          setLogoUrl(profile.logo_url || null)
        }

        if (settingsRes.ok) {
          const settings: AssessmentSettings | null = await settingsRes.json()
          if (settings) {
            setVatRate(settings.vat_rate ?? 15)
            setMaxRepairPercentage(settings.max_repair_percentage ?? 75)
            setPartsHandlingFee(settings.parts_handling_fee_percentage ?? 0)
            const rates: Record<string, number> = {}
            for (const { key } of LABOUR_RATE_FIELDS) {
              rates[key] = settings[key] ?? 0
            }
            setLabourRates(rates)
          }
        }

        // Load stationery colours
        const stationeryRes = await fetch('/api/settings/stationery')
        if (stationeryRes.ok) {
          const stationery = await stationeryRes.json()
          if (stationery.primary_colour) setPrimaryColour(stationery.primary_colour)
          if (stationery.accent_colour) setAccentColour(stationery.accent_colour)
        }

        if (repairersRes.ok) {
          const list = await repairersRes.json()
          setRepairers(list || [])
        }
      } catch {
        addToast('Failed to load data', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [addToast])

  const saveStep1 = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/org/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          legal_name: legalName,
          registration_number: registrationNumber,
          vat_number: vatNumber,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      addToast('Organisation details saved', 'success')
      setStep(2)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = useCallback(
    async (file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        addToast('File must be under 2 MB', 'error')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        addToast('File must be PNG, JPG, SVG, or WebP', 'error')
        return
      }
      setUploadingLogo(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/settings/stationery/logo', { method: 'POST', body: fd })
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
        const data = await res.json()
        setLogoUrl(data.logo_url)
        addToast('Logo uploaded', 'success')
      } catch (err: any) {
        addToast(err.message || 'Upload failed', 'error')
      } finally {
        setUploadingLogo(false)
      }
    },
    [addToast]
  )

  const saveStep2 = async () => {
    if (primaryColour && !HEX_RE.test(primaryColour)) {
      addToast('Primary colour must be a valid hex (e.g. #C9663D)', 'error')
      return
    }
    if (accentColour && !HEX_RE.test(accentColour)) {
      addToast('Accent colour must be a valid hex', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/stationery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_colour: primaryColour,
          accent_colour: accentColour,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      addToast('Branding saved', 'success')
      setStep(3)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveStep3 = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/assessment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat_rate: vatRate,
          max_repair_percentage: maxRepairPercentage,
          parts_handling_fee_percentage: partsHandlingFee,
          ...labourRates,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      addToast('Financial defaults saved', 'success')
      setStep(4)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addRepairer = async () => {
    if (!newRepairer.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/assessment/repairers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRepairer),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add')
      const data = await res.json()
      setRepairers((prev) => [...prev, data])
      setNewRepairer({ name: '', contact_number: '', email: '' })
      addToast('Repairer added', 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to add repairer', 'error')
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/org/complete-onboarding', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setStep(5)
    } catch (err: any) {
      addToast(err.message || 'Failed to complete', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadLogo(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadLogo(file)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper mb-4" />
        <p className="text-slate">Loading your setup...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate">
            Step {step} of {STEPS.length}
          </p>
          <p className="text-sm text-muted">{STEPS[step - 1].title}</p>
        </div>
        <div className="flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= s.id ? 'bg-accent' : 'bg-[#D4CFC7]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Organisation Details */}
      {step === 1 && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-charcoal">Organisation Details</h2>
              <p className="text-sm text-muted">Basic information for reports and invoicing</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Organisation Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="e.g. Acme Assessment Services"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="e.g. Acme Assessment Services (Pty) Ltd"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Registration Number</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="e.g. 2019/123456/07"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">VAT Number</label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="e.g. 4123456789"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="info@acme.co.za"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="021 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Physical Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                placeholder="123 Main Road, Cape Town, 8001"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-[#D4CFC7]">
            <button
              onClick={saveStep1}
              disabled={saving || !orgName.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Next'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Logo & Branding */}
      {step === 2 && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Palette className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-charcoal">Logo & Branding</h2>
              <p className="text-sm text-muted">Customise how your reports and documents look</p>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-charcoal mb-2">Organisation Logo</label>
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border border-[#D4CFC7] rounded-lg flex items-center justify-center bg-[#F5F2EE] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE] transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> Replace
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-accent bg-accent/5' : 'border-[#D4CFC7] hover:border-[#C9C4BC] bg-[#F5F2EE]/50'
                }`}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-8 h-8 mx-auto text-muted animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm font-medium text-charcoal">
                      Drag & drop your logo, or click to browse
                    </p>
                    <p className="text-xs text-muted mt-1">PNG, JPG, SVG, or WebP — max 2 MB</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Colour Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Primary Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_RE.test(primaryColour) ? primaryColour : '#C9663D'}
                  onChange={(e) => setPrimaryColour(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#D4CFC7] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColour}
                  onChange={(e) => setPrimaryColour(e.target.value)}
                  maxLength={7}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    HEX_RE.test(primaryColour) ? 'border-[#D4CFC7]' : 'border-red-400'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Accent Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={HEX_RE.test(accentColour) ? accentColour : '#1A1A2E'}
                  onChange={(e) => setAccentColour(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#D4CFC7] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={accentColour}
                  onChange={(e) => setAccentColour(e.target.value)}
                  maxLength={7}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    HEX_RE.test(accentColour) ? 'border-[#D4CFC7]' : 'border-red-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Mini Preview */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted uppercase tracking-wider mb-2">Preview</label>
            <div className="border border-[#D4CFC7] rounded-lg bg-white overflow-hidden text-xs">
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ backgroundColor: HEX_RE.test(accentColour) ? accentColour : '#1A1A2E' }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="w-8 h-8 object-contain rounded" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-white/60" />
                  </div>
                )}
                <span className="font-semibold text-white text-sm">{orgName || 'Your Organisation'}</span>
              </div>
              <div
                className="h-1"
                style={{ backgroundColor: HEX_RE.test(primaryColour) ? primaryColour : '#C9663D' }}
              />
              <div className="px-4 py-3 text-muted">Assessment Report Preview</div>
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={saveStep2}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Next'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Financial Defaults */}
      {step === 3 && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-charcoal">Financial Defaults</h2>
              <p className="text-sm text-muted">Set default rates used in assessments</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Core rates */}
            <div>
              <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wide mb-3">Calculation Defaults</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 15)}
                    className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Max Repair Value (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={maxRepairPercentage}
                    onChange={(e) => setMaxRepairPercentage(parseFloat(e.target.value) || 75)}
                    className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Parts Handling Fee (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={partsHandlingFee}
                    onChange={(e) => setPartsHandlingFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Labour rates */}
            <div>
              <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wide mb-1">Labour Rates (R/hour)</h3>
              <p className="text-xs text-muted mb-3">Applied automatically when adding repair line items</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LABOUR_RATE_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate mb-1">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={labourRates[key] || ''}
                        onChange={(e) =>
                          setLabourRates((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full pl-7 pr-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={saveStep3}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Next'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Approved Repairers */}
      {step === 4 && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Wrench className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-charcoal">Approved Repairers</h2>
              <p className="text-sm text-muted">Add your panel repairers (you can skip this step)</p>
            </div>
          </div>

          {/* Existing repairers */}
          {repairers.length > 0 && (
            <div className="space-y-2 mb-4">
              {repairers.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border border-[#D4CFC7] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate/50 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-charcoal">{r.name}</p>
                      {(r.contact_number || r.email) && (
                        <p className="text-xs text-muted">
                          {[r.contact_number, r.email].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add repairer form */}
          <div className="border border-[#D4CFC7] rounded-lg p-4 bg-[#F5F2EE]/50 space-y-3">
            <p className="text-sm font-medium text-charcoal">
              {repairers.length === 0 ? 'Add your first approved repairer' : 'Add another repairer'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate mb-1">Name *</label>
                <input
                  type="text"
                  value={newRepairer.name}
                  onChange={(e) => setNewRepairer({ ...newRepairer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="Repairer name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate mb-1">Contact</label>
                <input
                  type="text"
                  value={newRepairer.contact_number}
                  onChange={(e) => setNewRepairer({ ...newRepairer, contact_number: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate mb-1">Email</label>
                <input
                  type="email"
                  value={newRepairer.email}
                  onChange={(e) => setNewRepairer({ ...newRepairer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <button
              onClick={addRepairer}
              disabled={saving || !newRepairer.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Adding...' : 'Add Repairer'}
            </button>
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-muted hover:text-charcoal transition-colors"
              >
                Skip this step
              </button>
              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Completing...' : 'Complete Setup'}
                {!saving && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-charcoal mb-2">You&apos;re all set!</h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Your organisation is configured and ready to go. Here&apos;s a summary of what was set up:
          </p>

          <div className="bg-[#F5F2EE] rounded-lg p-5 text-left mb-8 max-w-md mx-auto">
            <div className="space-y-3">
              <SummaryItem
                label="Organisation"
                value={orgName || '—'}
                done={!!orgName}
              />
              <SummaryItem
                label="Logo"
                value={logoUrl ? 'Uploaded' : 'Not uploaded'}
                done={!!logoUrl}
              />
              <SummaryItem
                label="Brand Colours"
                value={`${primaryColour} / ${accentColour}`}
                done
              />
              <SummaryItem
                label="VAT Rate"
                value={`${vatRate}%`}
                done
              />
              <SummaryItem
                label="Labour Rates"
                value={
                  Object.values(labourRates).some((v) => v > 0)
                    ? 'Configured'
                    : 'Not set'
                }
                done={Object.values(labourRates).some((v) => v > 0)}
              />
              <SummaryItem
                label="Approved Repairers"
                value={
                  repairers.length > 0
                    ? `${repairers.length} added`
                    : 'None added'
                }
                done={repairers.length > 0}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/app/cases?create=1')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity"
            >
              Create Your First Case <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/app/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#D4CFC7] text-charcoal rounded-lg font-medium hover:bg-[#F5F2EE] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-gray-200'}`}>
        {done ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate">{label}</span>
      </div>
      <span className="text-sm font-medium text-charcoal truncate">{value}</span>
    </div>
  )
}
