'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Car,
  Building2,
  Scale,
  Search,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  LayoutDashboard,
  Mail,
  UserPlus,
  Settings2,
  Sparkles,
  PartyPopper,
  Globe,
  X,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { trackEvent } from '@/lib/events'
import { getCurrencySymbol } from '@/lib/utils/formatting'
import type { VerticalId } from '@/lib/verticals/config'

// ─── Country / currency / timezone reference data ────────────────────────────

interface CountryInfo {
  code: string
  name: string
  currency: string
  timezone: string
  regPlaceholder: string
  taxLabel: string
  taxPlaceholder: string
}

const COUNTRIES: CountryInfo[] = [
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', regPlaceholder: '2019/123456/07', taxLabel: 'VAT Number', taxPlaceholder: '4123456789' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', regPlaceholder: '12345678', taxLabel: 'VAT Number', taxPlaceholder: 'GB123456789' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', regPlaceholder: 'EIN 12-3456789', taxLabel: 'Tax ID (EIN)', taxPlaceholder: '12-3456789' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', regPlaceholder: 'ACN 123 456 789', taxLabel: 'ABN', taxPlaceholder: '12 345 678 901' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland', regPlaceholder: '1234567', taxLabel: 'GST Number', taxPlaceholder: '12-345-678' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi', regPlaceholder: 'PVT-1234567', taxLabel: 'PIN', taxPlaceholder: 'P051234567A' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos', regPlaceholder: 'RC1234567', taxLabel: 'TIN', taxPlaceholder: '12345678-0001' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', regPlaceholder: 'BN 123456789', taxLabel: 'GST/HST', taxPlaceholder: '123456789RT0001' },
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', regPlaceholder: 'U12345MH2019PTC123456', taxLabel: 'GSTIN', taxPlaceholder: '22AAAAA0000A1Z5' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', regPlaceholder: '1234567', taxLabel: 'TRN', taxPlaceholder: '100123456700003' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin', regPlaceholder: 'HRB 12345', taxLabel: 'USt-IdNr', taxPlaceholder: 'DE123456789' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris', regPlaceholder: '123 456 789 00012', taxLabel: 'TVA', taxPlaceholder: 'FR12345678901' },
]

const ALL_CURRENCIES = ['ZAR', 'USD', 'GBP', 'EUR', 'AUD', 'NZD', 'CAD', 'KES', 'NGN', 'INR', 'AED']

// ─── Professional type card definitions ──────────────────────────────────────

const ICON_MAP = { Car, Building2, Scale, Search, Briefcase } as const

interface ProfessionalType {
  id: VerticalId
  label: string
  description: string
  icon: keyof typeof ICON_MAP
}

const PROFESSIONAL_TYPES: ProfessionalType[] = [
  { id: 'motor_assessor', label: 'Motor Assessor', description: 'Vehicle damage assessment and repair/write-off recommendations', icon: 'Car' },
  { id: 'property_assessor', label: 'Property Assessor', description: 'Building and contents inspection and loss quantification', icon: 'Building2' },
  { id: 'loss_adjuster', label: 'Loss Adjuster', description: 'Multi-cover loss adjustment across motor, property, and BI', icon: 'Scale' },
  { id: 'investigator', label: 'Investigator / SIU', description: 'Fraud investigation, liability, and general investigation', icon: 'Search' },
  { id: 'general', label: 'General', description: 'I do multiple types of work and want full flexibility', icon: 'Briefcase' },
]

const CLIENT_TYPES = ['Insurer', 'Broker', 'Fleet manager', 'Legal firm', 'Private', 'Other'] as const
const RATE_TYPES = ['Flat fee', 'Hourly', 'Per assessment', 'Per km', 'Daily'] as const
const RATE_APPLIES_TO = ['All', 'Motor', 'Property', 'Investigation'] as const

// ─── Steps config ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Professional Type', icon: Briefcase },
  { id: 2, title: 'Company Profile', icon: Building2 },
  { id: 3, title: 'First Client', icon: UserPlus },
  { id: 4, title: 'Assessment Settings', icon: Settings2 },
  { id: 5, title: 'Comms Setup', icon: Mail },
  { id: 6, title: 'Complete', icon: Sparkles },
]

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm'
const labelCls = 'block text-sm font-medium text-charcoal mb-1'
const labelSmCls = 'block text-xs font-medium text-slate mb-1'
const cardBorder = 'border border-[#D4CFC7]'

export default function OnboardingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [selectedTypes, setSelectedTypes] = useState<VerticalId[]>([])

  // Step 2
  const [legalName, setLegalName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [taxLabel, setTaxLabel] = useState('VAT Number')
  const [taxId, setTaxId] = useState('')
  const [country, setCountry] = useState('ZA')
  const [currency, setCurrency] = useState('ZAR')
  const [timezone, setTimezone] = useState('Africa/Johannesburg')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const sigInputRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [clientName, setClientName] = useState('')
  const [clientType, setClientType] = useState<string>('Insurer')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientBillingEmail, setClientBillingEmail] = useState('')
  const [showRates, setShowRates] = useState(false)
  const [rateType, setRateType] = useState<string>('Flat fee')
  const [rateAmount, setRateAmount] = useState<number>(0)
  const [rateAppliesTo, setRateAppliesTo] = useState<string>('All')

  // Step 4 — motor
  const [defaultTaxRate, setDefaultTaxRate] = useState(15)
  const [maxRepairPct, setMaxRepairPct] = useState(75)
  const [labourRatePanel, setLabourRatePanel] = useState(0)
  const [labourRateMech, setLabourRateMech] = useState(0)
  const [labourRateElec, setLabourRateElec] = useState(0)
  const [labourRatePaint, setLabourRatePaint] = useState(0)
  const [labourRateStructural, setLabourRateStructural] = useState(0)
  const [labourRateTrim, setLabourRateTrim] = useState(0)
  const [labourRateGlass, setLabourRateGlass] = useState(0)
  // Step 4 — property
  const [defaultDepreciation, setDefaultDepreciation] = useState(0)
  const [reinstatementPerM2, setReinstatementPerM2] = useState(0)
  // Step 4 — investigator
  const [investigatorHourly, setInvestigatorHourly] = useState(0)
  const [investigatorDaily, setInvestigatorDaily] = useState(0)

  // Step 5
  const [commsEnabled, setCommsEnabled] = useState<boolean | null>(null)
  const [commsFromName, setCommsFromName] = useState('')
  const [commsReplyTo, setCommsReplyTo] = useState('')

  // Step 6 — summary tracking
  const [clientCreated, setClientCreated] = useState(false)

  const countryInfo = COUNTRIES.find((c) => c.code === country) || COUNTRIES[0]
  const currencySymbol = getCurrencySymbol(undefined, currency)

  const hasMotor = selectedTypes.includes('motor_assessor') || selectedTypes.includes('loss_adjuster') || selectedTypes.includes('general')
  const hasProperty = selectedTypes.includes('property_assessor') || selectedTypes.includes('loss_adjuster') || selectedTypes.includes('general')
  const hasInvestigator = selectedTypes.includes('investigator') || selectedTypes.includes('general')

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function toggleType(id: VerticalId) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function onCountryChange(code: string) {
    setCountry(code)
    const info = COUNTRIES.find((c) => c.code === code)
    if (info) {
      setCurrency(info.currency)
      setTimezone(info.timezone)
      setTaxLabel(info.taxLabel)
    }
  }

  const uploadFile = useCallback(
    async (file: File, endpoint: string, fieldName: string) => {
      if (file.size > 2 * 1024 * 1024) {
        addToast('File must be under 2 MB', 'error')
        return null
      }
      if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        addToast('File must be PNG, JPG, SVG, or WebP', 'error')
        return null
      }
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed')
      const data = await res.json()
      return data[fieldName] as string
    },
    [addToast]
  )

  const handleLogoUpload = useCallback(
    async (file: File) => {
      setUploadingLogo(true)
      try {
        const url = await uploadFile(file, '/api/settings/stationery/logo', 'logo_url')
        if (url) { setLogoUrl(url); addToast('Logo uploaded', 'success') }
      } catch (err: any) {
        addToast(err.message || 'Upload failed', 'error')
      } finally {
        setUploadingLogo(false)
      }
    },
    [uploadFile, addToast]
  )

  const handleSigUpload = useCallback(
    async (file: File) => {
      setUploadingSig(true)
      try {
        const url = await uploadFile(file, '/api/settings/stationery/logo', 'signature_url')
        if (url) { setSignatureUrl(url); addToast('Signature uploaded', 'success') }
      } catch (err: any) {
        addToast(err.message || 'Upload failed', 'error')
      } finally {
        setUploadingSig(false)
      }
    },
    [uploadFile, addToast]
  )

  // ─── Step save handlers ──────────────────────────────────────────────────

  async function saveStep1() {
    if (selectedTypes.length === 0) {
      addToast('Select at least one professional type', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/org/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professional_types: selectedTypes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      trackEvent('onboarding_step', { step: 1, step_name: 'professional_type', types: selectedTypes.join(',') })
      setStep(2)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveStep2() {
    if (!legalName.trim()) {
      addToast('Company name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/org/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_name: legalName,
          name: legalName,
          registration_number: regNumber,
          tax_label: taxLabel,
          tax_id: taxId,
          country,
          currency,
          timezone,
          address,
          logo_url: logoUrl,
          signature_url: signatureUrl,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      addToast('Company profile saved', 'success')
      trackEvent('onboarding_step', { step: 2, step_name: 'company_profile', country })
      setStep(3)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveStep3() {
    if (!clientName.trim()) {
      addToast('Client name is required', 'error')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, any> = {
        name: clientName,
        type: clientType,
        email: clientEmail,
        phone: clientPhone,
        billing_email: clientBillingEmail,
      }
      if (showRates && rateAmount > 0) {
        body.billing_rate = {
          type: rateType,
          amount: rateAmount,
          currency,
          applies_to: rateAppliesTo,
        }
      }
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setClientCreated(true)
      addToast('Client created', 'success')
      trackEvent('onboarding_step', { step: 3, step_name: 'first_client', client_type: clientType })
      setStep(4)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveStep4() {
    setSaving(true)
    try {
      const payload: Record<string, any> = { vat_rate: defaultTaxRate }
      if (hasMotor) {
        payload.max_repair_percentage = maxRepairPct
        payload.labour_rate_panel = labourRatePanel
        payload.labour_rate_mechanical = labourRateMech
        payload.labour_rate_electrical = labourRateElec
        payload.labour_rate_paint = labourRatePaint
        payload.labour_rate_structural = labourRateStructural
        payload.labour_rate_trim = labourRateTrim
        payload.labour_rate_glass = labourRateGlass
      }
      if (hasProperty) {
        payload.default_depreciation_rate = defaultDepreciation
        payload.default_reinstatement_per_m2 = reinstatementPerM2
      }
      if (hasInvestigator) {
        payload.default_hourly_rate = investigatorHourly
        payload.default_daily_rate = investigatorDaily
      }
      const res = await fetch('/api/settings/assessment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      addToast('Assessment settings saved', 'success')
      trackEvent('onboarding_step', { step: 4, step_name: 'assessment_settings' })
      setStep(5)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveStep5() {
    if (commsEnabled && commsFromName.trim()) {
      setSaving(true)
      try {
        const res = await fetch('/api/org/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comms_from_name: commsFromName,
            comms_reply_to: commsReplyTo,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
        addToast('Comms settings saved', 'success')
      } catch (err: any) {
        addToast(err.message || 'Failed to save', 'error')
      } finally {
        setSaving(false)
      }
    }
    completeOnboarding()
  }

  async function completeOnboarding() {
    setSaving(true)
    try {
      const res = await fetch('/api/org/complete-onboarding', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setStep(6)
    } catch (err: any) {
      addToast(err.message || 'Failed to complete', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function goBack() {
    if (step > 1) setStep(step - 1)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* Step indicator */}
      {step < 6 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate">
              Step {step} of {STEPS.length}
            </p>
            <p className="text-sm text-muted">{STEPS[step - 1].title}</p>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= s.id ? 'bg-accent' : 'bg-[#D4CFC7]'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Professional Type Selection ── */}
      {step === 1 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8`}>
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-charcoal">
              What kind of work do you do?
            </h2>
            <p className="text-sm text-muted mt-1">
              Select all that apply — this shapes your Refrag experience
            </p>
          </div>

          <div className="grid gap-3">
            {PROFESSIONAL_TYPES.map((pt) => {
              const Icon = ICON_MAP[pt.icon]
              const selected = selectedTypes.includes(pt.id)
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => toggleType(pt.id)}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                    selected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-[#D4CFC7] hover:border-[#C9C4BC] bg-white'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 p-2.5 rounded-lg transition-colors ${
                      selected ? 'bg-accent/15' : 'bg-[#F5F2EE]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-accent' : 'text-slate'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${selected ? 'text-accent' : 'text-charcoal'}`}>
                      {pt.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{pt.description}</p>
                  </div>
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                      selected
                        ? 'border-accent bg-accent'
                        : 'border-[#D4CFC7]'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-end mt-8 pt-6 border-t border-[#D4CFC7]">
            <button
              onClick={saveStep1}
              disabled={saving || selectedTypes.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Next'}
              {!saving && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Company Profile ── */}
      {step === 2 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8`}>
          <StepHeader
            icon={<Building2 className="w-5 h-5 text-accent" />}
            title="Company Profile"
            subtitle="Details for your reports, invoices, and legal documents"
          />

          <div className="space-y-4">
            <div>
              <label className={labelCls}>
                Legal Company Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} placeholder="e.g. Acme Assessment Services (Pty) Ltd" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Registration Number</label>
                <input type="text" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} className={inputCls} placeholder={countryInfo.regPlaceholder} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-charcoal">{taxLabel}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newLabel = prompt('Tax identifier label:', taxLabel)
                      if (newLabel) setTaxLabel(newLabel)
                    }}
                    className="text-[10px] text-accent hover:underline"
                  >
                    edit label
                  </button>
                </div>
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className={inputCls} placeholder={countryInfo.taxPlaceholder} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Country</label>
                <select value={country} onChange={(e) => onCountryChange(e.target.value)} className={inputCls}>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Timezone</label>
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Full street address" />
            </div>

            {/* Logo upload */}
            <div>
              <label className={labelCls}>Logo</label>
              {logoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border border-[#D4CFC7] rounded-lg flex items-center justify-center bg-[#F5F2EE] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE] transition-colors disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" /> Replace
                    </button>
                    <button onClick={() => setLogoUrl(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE] transition-colors text-red-600">
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D4CFC7] rounded-lg p-6 text-center cursor-pointer hover:border-[#C9C4BC] bg-[#F5F2EE]/50 transition-colors"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-6 h-6 mx-auto text-muted animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-muted mb-1" />
                      <p className="text-xs font-medium text-charcoal">Click to upload logo</p>
                      <p className="text-[11px] text-muted mt-0.5">PNG, JPG, or SVG — max 2 MB</p>
                    </>
                  )}
                </div>
              )}
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }} className="hidden" />
            </div>

            {/* Signature upload */}
            <div>
              <label className={labelCls}>Signature (for reports)</label>
              {signatureUrl ? (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-16 border border-[#D4CFC7] rounded-lg flex items-center justify-center bg-[#F5F2EE] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureUrl} alt="Signature" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => sigInputRef.current?.click()} disabled={uploadingSig} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE] transition-colors disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" /> Replace
                    </button>
                    <button onClick={() => setSignatureUrl(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE] transition-colors text-red-600">
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => sigInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D4CFC7] rounded-lg p-6 text-center cursor-pointer hover:border-[#C9C4BC] bg-[#F5F2EE]/50 transition-colors"
                >
                  {uploadingSig ? (
                    <Loader2 className="w-6 h-6 mx-auto text-muted animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto text-muted mb-1" />
                      <p className="text-xs font-medium text-charcoal">Click to upload signature</p>
                      <p className="text-[11px] text-muted mt-0.5">PNG or SVG on transparent background</p>
                    </>
                  )}
                </div>
              )}
              <input ref={sigInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSigUpload(f); e.target.value = '' }} className="hidden" />
            </div>
          </div>

          <StepFooter saving={saving} onBack={goBack} onNext={saveStep2} nextDisabled={!legalName.trim()} />
        </div>
      )}

      {/* ── Step 3: First Client ── */}
      {step === 3 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8`}>
          <StepHeader
            icon={<UserPlus className="w-5 h-5 text-accent" />}
            title="Add Your First Client"
            subtitle="You can add more clients later from settings"
          />

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Client Name <span className="text-red-500">*</span></label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="e.g. Hollard Insurance" />
            </div>

            <div>
              <label className={labelCls}>Client Type</label>
              <div className="flex flex-wrap gap-2">
                {CLIENT_TYPES.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setClientType(ct)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      clientType === ct
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-[#D4CFC7] text-slate hover:border-[#C9C4BC]'
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contact Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} placeholder="claims@client.com" />
              </div>
              <div>
                <label className={labelCls}>Contact Phone</label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputCls} placeholder="+27 12 345 6789" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Billing Email</label>
              <input type="email" value={clientBillingEmail} onChange={(e) => setClientBillingEmail(e.target.value)} className={inputCls} placeholder="accounts@client.com" />
            </div>

            {/* Billing rates toggle */}
            <div className="border border-[#D4CFC7] rounded-lg p-4 bg-[#F5F2EE]/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setShowRates(!showRates)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${showRates ? 'bg-accent' : 'bg-[#D4CFC7]'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showRates ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm font-medium text-charcoal">Set billing rates for this client?</span>
              </label>

              {showRates && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelSmCls}>Rate Type</label>
                    <select value={rateType} onChange={(e) => setRateType(e.target.value)} className={inputCls}>
                      {RATE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelSmCls}>Amount ({currencySymbol})</label>
                    <input type="number" min={0} step={0.01} value={rateAmount || ''} onChange={(e) => setRateAmount(parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelSmCls}>Applies To</label>
                    <select value={rateAppliesTo} onChange={(e) => setRateAppliesTo(e.target.value)} className={inputCls}>
                      {RATE_APPLIES_TO.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
            <button onClick={goBack} className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-muted hover:text-charcoal transition-colors text-sm"
              >
                Skip for now
              </button>
              <button
                onClick={saveStep3}
                disabled={saving || !clientName.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save & Next'}
                {!saving && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Assessment Settings ── */}
      {step === 4 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8`}>
          <StepHeader
            icon={<Settings2 className="w-5 h-5 text-accent" />}
            title="Assessment Settings"
            subtitle="Org-level defaults — can be overridden per client later"
          />

          <div className="space-y-6">
            {/* Universal: Tax rate */}
            <div>
              <label className={labelCls}>Default Tax Rate (%)</label>
              <input
                type="number" min={0} max={100} step={0.5}
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                className={`${inputCls} max-w-[160px]`}
              />
            </div>

            {/* Motor settings */}
            {hasMotor && (
              <div className="border border-[#D4CFC7] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Car className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-charcoal">Motor Assessment</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelSmCls}>Max Repair % (write-off threshold)</label>
                    <input
                      type="number" min={0} max={100} step={1}
                      value={maxRepairPct}
                      onChange={(e) => setMaxRepairPct(parseFloat(e.target.value) || 75)}
                      className={`${inputCls} max-w-[160px]`}
                    />
                  </div>
                  <div>
                    <label className={labelSmCls}>Default Labour Rates (per hour)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      {([
                        ['Panel Beating', labourRatePanel, setLabourRatePanel],
                        ['Mechanical', labourRateMech, setLabourRateMech],
                        ['Electrical', labourRateElec, setLabourRateElec],
                        ['Paint', labourRatePaint, setLabourRatePaint],
                        ['Structural', labourRateStructural, setLabourRateStructural],
                        ['Trim', labourRateTrim, setLabourRateTrim],
                        ['Glass', labourRateGlass, setLabourRateGlass],
                      ] as [string, number, React.Dispatch<React.SetStateAction<number>>][]).map(
                        ([label, val, setter]) => (
                          <div key={label}>
                            <label className={labelSmCls}>{label}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">{currencySymbol}</span>
                              <input
                                type="number" min={0} step={0.01}
                                value={val || ''}
                                onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                                className={`${inputCls} pl-8`}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Property settings */}
            {hasProperty && (
              <div className="border border-[#D4CFC7] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-charcoal">Property Assessment</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelSmCls}>Default Depreciation Rate (%)</label>
                    <input
                      type="number" min={0} max={100} step={0.5}
                      value={defaultDepreciation || ''}
                      onChange={(e) => setDefaultDepreciation(parseFloat(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelSmCls}>Default Reinstatement ({currencySymbol}/m²)</label>
                    <input
                      type="number" min={0} step={0.01}
                      value={reinstatementPerM2 || ''}
                      onChange={(e) => setReinstatementPerM2(parseFloat(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Investigator settings */}
            {hasInvestigator && (
              <div className="border border-[#D4CFC7] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-charcoal">Investigation</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelSmCls}>Default Hourly Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">{currencySymbol}</span>
                      <input
                        type="number" min={0} step={0.01}
                        value={investigatorHourly || ''}
                        onChange={(e) => setInvestigatorHourly(parseFloat(e.target.value) || 0)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelSmCls}>Default Daily Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-xs">{currencySymbol}</span>
                      <input
                        type="number" min={0} step={0.01}
                        value={investigatorDaily || ''}
                        onChange={(e) => setInvestigatorDaily(parseFloat(e.target.value) || 0)}
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <StepFooter saving={saving} onBack={goBack} onNext={saveStep4} />
        </div>
      )}

      {/* ── Step 5: Comms Setup ── */}
      {step === 5 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8`}>
          <StepHeader
            icon={<Mail className="w-5 h-5 text-accent" />}
            title="Comms Setup"
            subtitle="Optional — configure how Refrag sends emails on your behalf"
          />

          <div className="space-y-6">
            <div className="bg-[#F5F2EE]/70 rounded-lg p-4 text-sm text-slate leading-relaxed">
              <Globe className="w-5 h-5 text-accent mb-2" />
              Refrag can prompt you to send status updates automatically when you add a quote, submit a report, or complete an assessment. You can always edit templates later.
            </div>

            {commsEnabled === null && (
              <div className="flex gap-3">
                <button
                  onClick={() => setCommsEnabled(true)}
                  className="flex-1 py-4 rounded-xl border-2 border-[#D4CFC7] hover:border-accent hover:bg-accent/5 transition-all text-center"
                >
                  <Mail className="w-6 h-6 mx-auto text-accent mb-1" />
                  <p className="text-sm font-semibold text-charcoal">Yes, set it up</p>
                </button>
                <button
                  onClick={() => { setCommsEnabled(false); completeOnboarding() }}
                  className="flex-1 py-4 rounded-xl border-2 border-[#D4CFC7] hover:border-[#C9C4BC] transition-all text-center"
                >
                  <p className="text-sm font-semibold text-charcoal mt-3">Set up later</p>
                  <p className="text-xs text-muted mt-0.5">You can configure this in Settings</p>
                </button>
              </div>
            )}

            {commsEnabled === true && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>From Name</label>
                  <input type="text" value={commsFromName} onChange={(e) => setCommsFromName(e.target.value)} className={inputCls} placeholder="e.g. Acme Assessments" />
                </div>
                <div>
                  <label className={labelCls}>Reply-to Email</label>
                  <input type="email" value={commsReplyTo} onChange={(e) => setCommsReplyTo(e.target.value)} className={inputCls} placeholder="hello@acme.co.za" />
                </div>
              </div>
            )}
          </div>

          {commsEnabled === true && (
            <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
              <button onClick={goBack} className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => completeOnboarding()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-muted hover:text-charcoal transition-colors text-sm"
                >
                  Set up later
                </button>
                <button
                  onClick={saveStep5}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Finishing...' : 'Complete Setup'}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {commsEnabled === null && (
            <div className="flex justify-start mt-6 pt-6 border-t border-[#D4CFC7]">
              <button onClick={goBack} className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Complete ── */}
      {step === 6 && (
        <div className={`bg-white ${cardBorder} rounded-xl p-6 sm:p-8 text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center animate-bounce-once">
            <PartyPopper className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-charcoal mb-2">
            You&apos;re all set!
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Your workspace is configured and ready. Here&apos;s a summary:
          </p>

          <div className="bg-[#F5F2EE] rounded-lg p-5 text-left mb-8 max-w-md mx-auto space-y-3">
            <SummaryRow
              label="Professional Types"
              value={selectedTypes.map((t) => PROFESSIONAL_TYPES.find((p) => p.id === t)?.label).filter(Boolean).join(', ') || '—'}
              done={selectedTypes.length > 0}
            />
            <SummaryRow label="Company" value={legalName || '—'} done={!!legalName} />
            <SummaryRow label="Country" value={`${countryInfo.name} (${currency})`} done />
            <SummaryRow label="Logo" value={logoUrl ? 'Uploaded' : 'Not uploaded'} done={!!logoUrl} />
            <SummaryRow label="Signature" value={signatureUrl ? 'Uploaded' : 'Not uploaded'} done={!!signatureUrl} />
            <SummaryRow label="First Client" value={clientCreated ? clientName : 'Skipped'} done={clientCreated} />
            <SummaryRow label="Assessment Defaults" value="Configured" done />
            <SummaryRow
              label="Email Comms"
              value={commsEnabled ? 'Enabled' : 'Not set up'}
              done={!!commsEnabled}
            />
          </div>

          <button
            onClick={() => router.push('/app/dashboard')}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-accent/10">{icon}</div>
      <div>
        <h2 className="text-xl font-heading font-bold text-charcoal">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

function StepFooter({
  saving,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled,
}: {
  saving: boolean
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}) {
  return (
    <div className="flex justify-between mt-6 pt-6 border-t border-[#D4CFC7]">
      <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2.5 text-slate hover:text-charcoal transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <button
        onClick={onNext}
        disabled={saving || nextDisabled}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving...' : nextLabel}
        {!saving && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  )
}

function SummaryRow({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-gray-200'}`}>
        {done ? <Check className="w-3 h-3 text-green-600" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
      </div>
      <span className="text-sm text-slate flex-1 min-w-0">{label}</span>
      <span className="text-sm font-medium text-charcoal truncate max-w-[200px]">{value}</span>
    </div>
  )
}
