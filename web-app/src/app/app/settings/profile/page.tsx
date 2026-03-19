/**
 * Organisation profile - company details, logo, banking, addresses
 * All fields used in reports and tax invoices
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BankingDetails {
  account_holder: string
  bank: string
  account_number: string
  branch_name: string
  branch_code: string
}

interface OrgProfile {
  name: string
  legal_name: string
  registration_number: string
  vat_number: string
  postal_address: string
  physical_address: string
  phone: string
  email: string
  country: string
  logo_storage_path: string | null
  banking_details: BankingDetails
}

const emptyBanking: BankingDetails = {
  account_holder: '',
  bank: '',
  account_number: '',
  branch_name: '',
  branch_code: '',
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<OrgProfile>({
    name: '',
    legal_name: '',
    registration_number: '',
    vat_number: '',
    postal_address: '',
    physical_address: '',
    phone: '',
    email: '',
    country: '',
    logo_storage_path: null,
    banking_details: { ...emptyBanking },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()
      if (!orgMember) return
      const { data: org } = await supabase
        .from('organisations')
        .select('name, legal_name, registration_number, vat_number, address, postal_address, physical_address, phone, email, country, logo_storage_path, banking_details')
        .eq('id', orgMember.org_id)
        .single()
      if (org) {
        const bd = (org.banking_details && typeof org.banking_details === 'object')
          ? { ...emptyBanking, ...(org.banking_details as Partial<BankingDetails>) }
          : { ...emptyBanking }
        setProfile({
          name: org.name || '',
          legal_name: org.legal_name || '',
          registration_number: org.registration_number || '',
          vat_number: org.vat_number || '',
          postal_address: org.postal_address || org.address || '',
          physical_address: org.physical_address || '',
          phone: org.phone || '',
          email: org.email || '',
          country: org.country || '',
          logo_storage_path: org.logo_storage_path || null,
          banking_details: bd,
        })
        if (org.logo_storage_path) {
          const { data: url } = supabase.storage.from('evidence').createSignedUrl(org.logo_storage_path, 3600)
          setLogoUrl(url?.signedUrl || null)
        }
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()
      if (!orgMember) throw new Error('No organisation')
      const { error } = await supabase
        .from('organisations')
        .update({
          name: profile.name || null,
          legal_name: profile.legal_name || null,
          registration_number: profile.registration_number || null,
          vat_number: profile.vat_number || null,
          postal_address: profile.postal_address || null,
          physical_address: profile.physical_address || null,
          phone: profile.phone || null,
          email: profile.email || null,
          country: profile.country || null,
          banking_details: profile.banking_details,
        })
        .eq('id', orgMember.org_id)
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: orgMember } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
    if (!orgMember) return
    const ext = file.name.split('.').pop() || 'png'
    const path = `orgs/${orgMember.org_id}/logo.${ext}`
    const { error } = await supabase.storage.from('evidence').upload(path, file, { upsert: true })
    if (error) {
      alert(error.message)
      return
    }
    const { error: updateErr } = await supabase
      .from('organisations')
      .update({ logo_storage_path: path })
      .eq('id', orgMember.org_id)
    if (updateErr) alert(updateErr.message)
    else {
      setProfile((p) => ({ ...p, logo_storage_path: path }))
      setLogoUrl(URL.createObjectURL(file))
    }
  }

  const updateBanking = (field: keyof BankingDetails, value: string) => {
    setProfile((p) => ({
      ...p,
      banking_details: { ...p.banking_details, [field]: value },
    }))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="h-9 w-64 bg-[#F5F2EE] rounded animate-pulse" />
          <div className="h-4 w-48 bg-[#F5F2EE] rounded animate-pulse mt-2" />
        </div>
        <div className="max-w-3xl space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-[#F5F2EE] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Company Profile</h1>
        <p className="text-slate mt-1">Details used in reports, invoices, and correspondence</p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-8">
        {/* Logo */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-semibold text-charcoal border-b border-[#D4CFC7] pb-2">Logo</h2>
          <p className="text-xs text-muted">Appears on report PDF headers and tax invoices</p>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain border border-[#D4CFC7] rounded" />
            ) : (
              <div className="h-16 w-24 border border-dashed border-[#D4CFC7] rounded flex items-center justify-center text-xs text-muted">
                No logo
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-[#F5F2EE]"
            >
              {profile.logo_storage_path ? 'Change logo' : 'Upload logo'}
            </button>
          </div>
        </section>

        {/* Company Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-charcoal border-b border-[#D4CFC7] pb-2">Company Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Company Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Legal Name</label>
              <input
                type="text"
                value={profile.legal_name}
                onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })}
                placeholder="As registered (e.g. V&H Assessing (Pty) Limited)"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Registration No</label>
              <input
                type="text"
                value={profile.registration_number}
                onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">VAT No</label>
              <input
                type="text"
                value={profile.vat_number}
                onChange={(e) => setProfile({ ...profile, vat_number: e.target.value })}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Country</label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                placeholder="e.g. United States"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
          </div>
        </section>

        {/* Addresses */}
        <section className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-charcoal border-b border-[#D4CFC7] pb-2">Addresses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Postal Address</label>
              <textarea
                value={profile.postal_address}
                onChange={(e) => setProfile({ ...profile, postal_address: e.target.value })}
                rows={3}
                placeholder="Full address"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate resize-none placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Physical Address</label>
              <textarea
                value={profile.physical_address}
                onChange={(e) => setProfile({ ...profile, physical_address: e.target.value })}
                rows={3}
                placeholder="Full address"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate resize-none placeholder:text-muted"
              />
            </div>
          </div>
        </section>

        {/* Banking Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-heading font-semibold text-charcoal border-b border-[#D4CFC7] pb-2">Banking Details</h2>
          <p className="text-xs text-muted">Displayed on tax invoices for client payments</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Account Holder</label>
              <input
                type="text"
                value={profile.banking_details.account_holder}
                onChange={(e) => updateBanking('account_holder', e.target.value)}
                placeholder="e.g. V and H Assessing"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Bank</label>
              <input
                type="text"
                value={profile.banking_details.bank}
                onChange={(e) => updateBanking('bank', e.target.value)}
                placeholder="e.g. First National Bank"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Account Number</label>
              <input
                type="text"
                value={profile.banking_details.account_number}
                onChange={(e) => updateBanking('account_number', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Branch</label>
                <input
                  type="text"
                  value={profile.banking_details.branch_name}
                  onChange={(e) => updateBanking('branch_name', e.target.value)}
                  placeholder="e.g. Greyville"
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Branch Code</label>
                <input
                  type="text"
                  value={profile.banking_details.branch_code}
                  onChange={(e) => updateBanking('branch_code', e.target.value)}
                  placeholder="e.g. 222726"
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved successfully</span>
          )}
        </div>
      </form>
    </div>
  )
}
