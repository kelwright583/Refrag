/**
 * Client detail - edit client + manage rules
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClient, useUpdateClient } from '@/hooks/use-clients'
import { useCases } from '@/hooks/use-cases'
import { useClientRules, useUpsertClientRule, useDeleteClientRule } from '@/hooks/use-client-rules'
import { STANDARD_RULE_KEYS, ClientRule } from '@/lib/types/client-rule'
import { Case, CaseStatus } from '@/lib/types/case'
import { FileText } from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const { data: client, isLoading } = useClient(clientId)
  const updateClient = useUpdateClient(clientId)
  const { data: rules, isLoading: rulesLoading } = useClientRules(clientId)
  const upsertRule = useUpsertClientRule()
  const deleteRule = useDeleteClientRule(clientId)

  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [postalAddress, setPostalAddress] = useState('')
  const [physicalAddress, setPhysicalAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (client) {
      setName(client.name)
      setContactEmail(client.contact_email || '')
      setContactPhone(client.contact_phone || '')
      setBillingEmail(client.billing_email || '')
      setVatNumber(client.vat_number || '')
      setPostalAddress(client.postal_address || '')
      setPhysicalAddress(client.physical_address || '')
      setNotes(client.notes || '')
    }
  }, [client])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await updateClient.mutateAsync({
        name: name.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        billing_email: billingEmail.trim() || undefined,
        vat_number: vatNumber.trim() || undefined,
        postal_address: postalAddress.trim() || undefined,
        physical_address: physicalAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      })
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (isLoading || !client) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="h-9 w-48 bg-[#F5F2EE] rounded animate-pulse" />
          <div className="h-4 w-32 bg-[#F5F2EE] rounded animate-pulse mt-2" />
        </div>
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-[#F5F2EE] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/app/clients"
        className="text-sm text-muted hover:text-slate mb-6 inline-block"
      >
        Back to Clients
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">{client.name}</h1>
        <p className="text-slate mt-1">Edit client details and configure rules</p>
      </div>

      {/* Client Cases Dashboard */}
      <ClientCasesSection clientId={clientId} clientName={client.name} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Client Details */}
        <div>
          <h2 className="text-lg font-heading font-bold text-charcoal mb-4">Client Details</h2>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Contact email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Contact phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Billing email</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">VAT Number</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="Client VAT number (for invoicing)"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Postal Address</label>
              <textarea
                value={postalAddress}
                onChange={(e) => setPostalAddress(e.target.value)}
                rows={2}
                placeholder="Street, suburb, city, postal code"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Physical Address</label>
              <textarea
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                rows={2}
                placeholder="Street, suburb, city, postal code"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={updateClient.isPending || !name.trim()}
              className="px-5 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
            >
              {updateClient.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Client Rules */}
        <div>
          <h2 className="text-lg font-heading font-bold text-charcoal mb-4">Rules &amp; Mandates</h2>
          <p className="text-sm text-muted mb-4">
            Configure this client&apos;s write-off thresholds, labour rates, settlement basis, and parts policy. These rules drive case assessments and reporting.
          </p>

          {rulesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#F5F2EE] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(STANDARD_RULE_KEYS).map(([ruleKey, meta]) => {
                const existing = rules?.find((r: ClientRule) => r.rule_key === ruleKey)
                return (
                  <RuleEditor
                    key={ruleKey}
                    clientId={clientId}
                    ruleKey={ruleKey}
                    meta={meta}
                    existing={existing || null}
                    onSave={async (value) => {
                      await upsertRule.mutateAsync({
                        client_id: clientId,
                        rule_key: ruleKey,
                        rule_value: value,
                        description: meta.description,
                      })
                    }}
                    onDelete={existing ? async () => {
                      await deleteRule.mutateAsync(ruleKey)
                    } : undefined}
                    isSaving={upsertRule.isPending}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Client Cases mini-dashboard
 */
function ClientCasesSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter()
  const { data: allCases, isLoading } = useCases()

  const clientCases = useMemo(() => {
    return (allCases || []).filter((c) => c.client_id === clientId)
  }, [allCases, clientId])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    clientCases.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1 })
    return counts
  }, [clientCases])

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', assigned: 'Assigned', site_visit: 'Site Visit',
    awaiting_quote: 'Awaiting Quote', reporting: 'Reporting', submitted: 'Submitted',
    additional: 'Additional', closed: 'Closed',
  }

  const getStatusColor = (s: string) => {
    if (s === 'draft') return 'bg-gray-100 text-gray-800'
    if (s === 'submitted' || s === 'closed') return 'bg-green-100 text-green-800'
    return 'bg-copper/10 text-copper'
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const activeCases = clientCases.filter((c) => c.status !== 'closed')
  const recentCases = [...clientCases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5)

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-bold text-charcoal">Cases</h2>
        <Link href={`/app/cases?client=${clientId}`} className="text-xs text-accent hover:underline">View all cases</Link>
      </div>

      {isLoading ? (
        <div className="h-12 bg-[#F5F2EE] rounded animate-pulse" />
      ) : clientCases.length === 0 ? (
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted">No cases for this client yet</p>
        </div>
      ) : (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-[#F5F2EE] rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold text-charcoal">{clientCases.length}</p>
              <p className="text-xs text-muted">Total</p>
            </div>
            <div className="bg-copper/5 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold text-copper">{activeCases.length}</p>
              <p className="text-xs text-muted">Active</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold text-green-700">{statusCounts['submitted'] || 0}</p>
              <p className="text-xs text-muted">Submitted</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold text-gray-600">{statusCounts['closed'] || 0}</p>
              <p className="text-xs text-muted">Closed</p>
            </div>
          </div>

          {/* Recent Cases */}
          <p className="text-xs font-medium text-slate mb-2">Recent Cases</p>
          <div className="divide-y divide-[#D4CFC7]">
            {recentCases.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/app/cases/${c.id}`)}
                className="py-2 flex items-center justify-between cursor-pointer hover:bg-[#FAFAF8] -mx-2 px-2 rounded"
              >
                <div>
                  <span className="text-sm font-medium text-charcoal">{c.case_number}</span>
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${getStatusColor(c.status)}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                <span className="text-xs text-muted">{formatDate(c.updated_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Individual rule editor
 */
function RuleEditor({
  ruleKey,
  meta,
  existing,
  onSave,
  onDelete,
  isSaving,
}: {
  clientId: string
  ruleKey: string
  meta: { label: string; description: string; inputType: string }
  existing: ClientRule | null
  onSave: (value: Record<string, unknown>) => Promise<void>
  onDelete?: () => Promise<void>
  isSaving: boolean
}) {
  const currentValue = existing?.rule_value
  const [localValue, setLocalValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (currentValue) {
      const val = currentValue.value
      if (Array.isArray(val)) {
        setLocalValue(val.join(', '))
      } else {
        setLocalValue(String(val ?? ''))
      }
    } else {
      setLocalValue('')
    }
  }, [currentValue])

  const handleSave = async () => {
    let parsedValue: unknown = localValue

    if (meta.inputType === 'number' || meta.inputType === 'currency') {
      parsedValue = parseFloat(localValue)
      if (isNaN(parsedValue as number)) return
    }
    if (meta.inputType === 'multi_select') {
      parsedValue = localValue.split(',').map((s) => s.trim()).filter(Boolean)
    }

    await onSave({ value: parsedValue })
    setIsEditing(false)
  }

  const displayValue = () => {
    if (!existing) return <span className="text-muted italic text-sm">Not set</span>
    const val = currentValue?.value
    if (val === undefined || val === null) return <span className="text-muted italic text-sm">Not set</span>
    if (meta.inputType === 'currency') return <span className="text-slate font-medium">R {Number(val).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
    if (meta.inputType === 'number') return <span className="text-slate font-medium">{String(val)}%</span>
    if (Array.isArray(val)) return <span className="text-slate font-medium">{(val as string[]).join(', ')}</span>
    return <span className="text-slate font-medium capitalize">{String(val).replace(/_/g, ' ')}</span>
  }

  return (
    <div className="border border-[#D4CFC7] rounded-lg p-4">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-medium text-charcoal">{meta.label}</p>
          <p className="text-xs text-muted">{meta.description}</p>
        </div>
        <div className="flex gap-1">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-accent hover:underline"
            >
              {existing ? 'Edit' : 'Set'}
            </button>
          )}
          {!isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:underline ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-2 flex gap-2 items-end">
          {meta.inputType === 'select' && ruleKey === 'settlement_basis' ? (
            <select
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
            >
              <option value="">Select...</option>
              <option value="retail">Retail</option>
              <option value="trade">Trade</option>
              <option value="market">Market</option>
            </select>
          ) : meta.inputType === 'select' && ruleKey === 'parts_policy' ? (
            <select
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
            >
              <option value="">Select...</option>
              <option value="oem_only">OEM Only</option>
              <option value="alternate_allowed">Alternate Allowed</option>
              <option value="mixed">Mixed</option>
            </select>
          ) : (
            <input
              type={meta.inputType === 'number' || meta.inputType === 'currency' ? 'number' : 'text'}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={meta.inputType === 'multi_select' ? 'e.g. 3, 3a, 4' : ''}
              className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
            />
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !localValue}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-muted hover:text-slate"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-1">{displayValue()}</div>
      )}
    </div>
  )
}
