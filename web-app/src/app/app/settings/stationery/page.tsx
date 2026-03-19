'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Palette,
  Type,
  Image as ImageIcon,
  FileText,
  Loader2,
} from 'lucide-react'

interface StationeryData {
  logo_url: string | null
  primary_colour: string
  accent_colour: string
  text_colour: string
  footer_disclaimer: string | null
  name: string | null
  legal_name: string | null
  registration_number: string | null
  vat_number: string | null
}

const DEFAULTS = {
  primary_colour: '#C9663D',
  accent_colour: '#1A1A2E',
  text_colour: '#1A1A2E',
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export default function StationeryPage() {
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [primaryColour, setPrimaryColour] = useState(DEFAULTS.primary_colour)
  const [accentColour, setAccentColour] = useState(DEFAULTS.accent_colour)
  const [textColour, setTextColour] = useState(DEFAULTS.text_colour)
  const [footerDisclaimer, setFooterDisclaimer] = useState('')
  const [orgName, setOrgName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    fetch('/api/settings/stationery')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then((data: StationeryData) => {
        setLogoUrl(data.logo_url)
        setPrimaryColour(data.primary_colour || DEFAULTS.primary_colour)
        setAccentColour(data.accent_colour || DEFAULTS.accent_colour)
        setTextColour(data.text_colour || DEFAULTS.text_colour)
        setFooterDisclaimer(data.footer_disclaimer || '')
        setOrgName(data.name || data.legal_name || 'Your Organisation')
      })
      .catch(() => addToast('Failed to load stationery settings', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

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
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Upload failed')
        }
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

  const removeLogo = async () => {
    setRemovingLogo(true)
    try {
      const res = await fetch('/api/settings/stationery/logo', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove logo')
      setLogoUrl(null)
      addToast('Logo removed', 'success')
    } catch {
      addToast('Failed to remove logo', 'error')
    } finally {
      setRemovingLogo(false)
    }
  }

  const handleSave = async () => {
    for (const [label, val] of [
      ['Primary colour', primaryColour],
      ['Accent colour', accentColour],
      ['Text colour', textColour],
    ] as const) {
      if (!HEX_RE.test(val)) {
        addToast(`${label} must be a valid hex (e.g. #C9663D)`, 'error')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/stationery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_colour: primaryColour,
          accent_colour: accentColour,
          text_colour: textColour,
          footer_disclaimer: footerDisclaimer || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      addToast('Stationery settings saved', 'success')
    } catch (err: any) {
      addToast(err.message || 'Save failed', 'error')
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-6 w-28 bg-surface rounded animate-pulse mb-6" />
        <div className="h-10 w-64 bg-surface rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-surface rounded animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-surface rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-slate mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Stationery &amp; Branding</h1>
        <p className="text-muted mt-1">
          Customise how your reports, invoices, and documents look
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left column – controls */}
        <div className="lg:col-span-3 space-y-6">
          {/* Logo */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-charcoal" />
              <h2 className="text-lg font-heading font-semibold text-charcoal">Organisation Logo</h2>
            </div>

            {logoUrl ? (
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 border border-[#D4CFC7] rounded-lg flex items-center justify-center bg-surface overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Organisation logo" className="max-w-full max-h-full object-contain p-2" />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#D4CFC7] rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Replace
                  </button>
                  <button
                    onClick={removeLogo}
                    disabled={removingLogo}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Remove
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
                  dragOver ? 'border-accent bg-accent/5' : 'border-[#D4CFC7] hover:border-[#C9C4BC] bg-surface/50'
                }`}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-8 h-8 mx-auto text-muted animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-muted mb-2" />
                    <p className="text-sm font-medium text-charcoal">
                      Drag &amp; drop your logo, or click to browse
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
          </section>

          {/* Colours */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-charcoal" />
              <h2 className="text-lg font-heading font-semibold text-charcoal">Brand Colours</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <ColourField
                label="Primary"
                value={primaryColour}
                onChange={setPrimaryColour}
                defaultVal={DEFAULTS.primary_colour}
              />
              <ColourField
                label="Accent"
                value={accentColour}
                onChange={setAccentColour}
                defaultVal={DEFAULTS.accent_colour}
              />
              <ColourField
                label="Text"
                value={textColour}
                onChange={setTextColour}
                defaultVal={DEFAULTS.text_colour}
              />
            </div>
          </section>

          {/* Footer disclaimer */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-charcoal" />
              <h2 className="text-lg font-heading font-semibold text-charcoal">Footer Disclaimer</h2>
            </div>

            <textarea
              value={footerDisclaimer}
              onChange={(e) => setFooterDisclaimer(e.target.value)}
              rows={3}
              placeholder="e.g. This report is confidential and intended solely for the addressee…"
              className="w-full border border-[#D4CFC7] rounded-lg px-4 py-3 text-sm text-charcoal placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-y"
            />
            <p className="text-xs text-muted mt-2">
              &quot;Powered by Refrag · refrag.app&quot; always appears at the bottom of documents and is not editable.
            </p>
          </section>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 transition-opacity disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Stationery'}
          </button>
        </div>

        {/* Right column – live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-8">
            <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
              Live Preview
            </h3>
            <ReportPreview
              logoUrl={logoUrl}
              orgName={orgName}
              primaryColour={primaryColour}
              accentColour={accentColour}
              textColour={textColour}
              footerDisclaimer={footerDisclaimer}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Colour field                                                        */
/* ------------------------------------------------------------------ */

function ColourField({
  label,
  value,
  onChange,
  defaultVal,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  defaultVal: string
}) {
  const isValid = HEX_RE.test(value)

  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValid ? value : defaultVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-[#D4CFC7] cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            isValid ? 'border-[#D4CFC7]' : 'border-red-400'
          }`}
        />
      </div>
      <p className="text-xs text-muted mt-1">Default: {defaultVal}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live report preview                                                 */
/* ------------------------------------------------------------------ */

function ReportPreview({
  logoUrl,
  orgName,
  primaryColour,
  accentColour,
  textColour,
  footerDisclaimer,
}: {
  logoUrl: string | null
  orgName: string
  primaryColour: string
  accentColour: string
  textColour: string
  footerDisclaimer: string
}) {
  const pc = HEX_RE.test(primaryColour) ? primaryColour : DEFAULTS.primary_colour
  const ac = HEX_RE.test(accentColour) ? accentColour : DEFAULTS.accent_colour
  const tc = HEX_RE.test(textColour) ? textColour : DEFAULTS.text_colour

  return (
    <div className="border border-[#D4CFC7] rounded-lg bg-white shadow-sm overflow-hidden text-xs">
      {/* Header band */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: ac }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-10 h-10 object-contain rounded" />
        ) : (
          <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">
            <Type className="w-5 h-5 text-white/60" />
          </div>
        )}
        <div>
          <p className="font-semibold text-white text-sm leading-tight">{orgName}</p>
          <p className="text-white/60 text-[10px]">Professional Assessment Services</p>
        </div>
      </div>

      {/* Accent line */}
      <div className="h-1" style={{ backgroundColor: pc }} />

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        <h4 className="font-bold text-sm" style={{ color: tc }}>Assessment Report</h4>

        <div className="border-l-2 pl-3 space-y-1" style={{ borderColor: pc }}>
          <p style={{ color: tc }}>Claim Ref: CLM-2025-001234</p>
          <p className="text-muted">Date: 18 Mar 2026</p>
        </div>

        <div className="rounded p-3" style={{ backgroundColor: `${ac}08` }}>
          <p className="font-medium mb-1" style={{ color: tc }}>Vehicle Details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted">
            <span>Make / Model</span>
            <span style={{ color: tc }}>Toyota Hilux 2.8 GD-6</span>
            <span>Registration</span>
            <span style={{ color: tc }}>CA 123-456</span>
          </div>
        </div>

        <div>
          <p className="font-medium mb-1" style={{ color: tc }}>Assessment Summary</p>
          <div className="h-2 rounded-full w-3/4 mb-1" style={{ backgroundColor: `${pc}30` }}>
            <div className="h-2 rounded-full w-3/5" style={{ backgroundColor: pc }} />
          </div>
          <p className="text-muted">Repair estimate: R 45,200.00</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#D4CFC7] px-5 py-3 space-y-1" style={{ backgroundColor: `${ac}06` }}>
        {footerDisclaimer && (
          <p className="text-[9px] text-muted leading-snug">{footerDisclaimer}</p>
        )}
        <p className="text-[9px] text-muted/60">Powered by Refrag · refrag.app</p>
      </div>
    </div>
  )
}
