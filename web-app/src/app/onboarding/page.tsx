/**
 * Onboarding wizard: Account → Company Profile → Clients → Rate Matrix (optional)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RefragLogo } from '@/components/brand'

const STEPS = [
  { id: 1, title: 'Account', short: 'Account' },
  { id: 2, title: 'Company profile', short: 'Profile' },
  { id: 3, title: 'Add clients', short: 'Clients' },
  { id: 4, title: 'Rate matrix (optional)', short: 'Rates' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')

  // Step 2
  const [legalName, setLegalName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [address, setAddress] = useState('')

  // Step 3 - clients (list of { name, contact_email })
  const [clients, setClients] = useState<{ name: string; contact_email: string }[]>([{ name: '', contact_email: '' }])

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: orgMember } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
      if (!orgMember) return
      setOrgId(orgMember.org_id)
      const { data: org } = await supabase.from('organisations').select('name, country, legal_name, registration_number, vat_number, address').eq('id', orgMember.org_id).single()
      if (org) {
        setCompanyName(org.name || '')
        setCountry(org.country || '')
        setLegalName(org.legal_name || '')
        setRegistrationNumber(org.registration_number || '')
        setVatNumber(org.vat_number || '')
        setAddress(org.address || '')
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('organisations').update({ name: companyName || null, country: country || null }).eq('id', orgId)
      if (error) throw error
      setStep(2)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('organisations').update({
        legal_name: legalName || null,
        registration_number: registrationNumber || null,
        vat_number: vatNumber || null,
        address: address || null,
      }).eq('id', orgId)
      if (error) throw error
      setStep(3)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addClientRow = () => setClients((c) => [...c, { name: '', contact_email: '' }])
  const updateClient = (i: number, field: 'name' | 'contact_email', value: string) => {
    setClients((c) => {
      const next = [...c]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    const toCreate = clients.filter((c) => c.name.trim())
    if (toCreate.length === 0) {
      alert('Add at least one client.')
      return
    }
    setSaving(true)
    try {
      for (const c of toCreate) {
        const { error } = await supabase.from('clients').insert({ org_id: orgId, name: c.name.trim(), contact_email: c.contact_email.trim() || null })
        if (error) throw error
      }
      setStep(4)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/organisations/onboarding', { method: 'PATCH' })
      if (!res.ok) throw new Error((await res.json()).error)
      router.replace('/app/dashboard')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const finishLater = () => {
    router.replace('/app/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper mb-4" />
        <p className="text-slate">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex gap-2 mb-8 justify-center">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full max-w-[80px] ${step >= s.id ? 'bg-accent' : 'bg-[#D4CFC7]'}`}
            aria-hidden
          />
        ))}
      </div>
      <h1 className="text-2xl font-heading font-bold text-slate mb-1">{STEPS[step - 1].title}</h1>
      <p className="text-sm text-muted mb-6">
        {step === 1 && 'Company name and country for your account.'}
        {step === 2 && 'Details for reports and invoicing.'}
        {step === 3 && 'Add at least one client (insurer, fleet manager, etc.).'}
        {step === 4 && 'You can set rate matrices later in Settings.'}
      </p>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. South Africa"
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving || !companyName.trim()} className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">
              {saving ? 'Saving...' : 'Next'}
            </button>
            <button type="button" onClick={finishLater} className="px-4 py-2 text-muted hover:text-slate">Finish later</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Legal name</label>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Registration no</label>
              <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">VAT no</label>
              <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate resize-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-muted hover:text-slate">Back</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">Next</button>
            <button type="button" onClick={finishLater} className="px-4 py-2 text-muted hover:text-slate">Finish later</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleStep3} className="space-y-4">
          {clients.map((c, i) => (
            <div key={i} className="p-4 border border-[#D4CFC7] rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Client name"
                value={c.name}
                onChange={(e) => updateClient(i, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
              <input
                type="email"
                placeholder="Contact email (optional)"
                value={c.contact_email}
                onChange={(e) => updateClient(i, 'contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
          ))}
          <button type="button" onClick={addClientRow} className="text-sm text-accent hover:opacity-80">+ Add another client</button>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2 text-muted hover:text-slate">Back</button>
            <button type="submit" disabled={saving || !clients.some((c) => c.name.trim())} className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">Next</button>
            <button type="button" onClick={finishLater} className="px-4 py-2 text-muted hover:text-slate">Finish later</button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-slate">You can configure labour rates, markups and SLAs per client later in Settings → Clients.</p>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(3)} className="px-4 py-2 text-muted hover:text-slate">Back</button>
            <button type="button" onClick={completeOnboarding} disabled={saving} className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">
              {saving ? 'Completing...' : 'Complete setup'}
            </button>
            <button type="button" onClick={finishLater} className="px-4 py-2 text-muted hover:text-slate">Finish later</button>
          </div>
        </div>
      )}
    </div>
  )
}
