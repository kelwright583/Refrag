'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClient, useUpdateClient } from '@/hooks/use-clients'
import { useCases } from '@/hooks/use-cases'
import { useClientRules, useUpsertClientRule, useDeleteClientRule } from '@/hooks/use-client-rules'
import { useClientRates, useCreateClientRate, useUpdateClientRate, useDeleteClientRate } from '@/hooks/use-client-rates'
import { STANDARD_RULE_KEYS, ClientRule } from '@/lib/types/client-rule'
import { ClientRate, RATE_TYPE_OPTIONS, RATE_APPLIES_TO_OPTIONS, RateType } from '@/lib/types/client-rate'
import { FileText, Plus, Trash2, Edit2, X, Check, BookOpen } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/formatting'

type TabId = 'details' | 'rates' | 'rules' | 'mandates'

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'rates', label: 'Rate Structures' },
  { id: 'rules', label: 'Rules' },
  { id: 'mandates', label: 'Mandates' },
]

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.clientId as string
  const { data: client, isLoading } = useClient(clientId)
  const [activeTab, setActiveTab] = useState<TabId>('details')

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
        &larr; Back to Clients
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">{client.name}</h1>
        <p className="text-slate mt-1">Manage client details, billing rates, rules, and mandates</p>
      </div>

      <ClientCasesSection clientId={clientId} clientName={client.name} />

      {/* Tabs */}
      <div className="border-b border-[#D4CFC7] mb-6">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-slate hover:border-[#D4CFC7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'details' && <ClientDetailsTab clientId={clientId} client={client} />}
      {activeTab === 'rates' && <RateStructuresTab clientId={clientId} />}
      {activeTab === 'rules' && <ClientRulesTab clientId={clientId} />}
      {activeTab === 'mandates' && <MandateLibraryTab clientId={clientId} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENT DETAILS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function ClientDetailsTab({ clientId, client }: { clientId: string; client: any }) {
  const updateClient = useUpdateClient(clientId)

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

  const inputCls = 'w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate focus:outline-none focus:ring-2 focus:ring-accent'

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-heading font-bold text-charcoal mb-4">Client Details</h2>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Contact email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Contact phone</label>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Billing email</label>
            <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">VAT Number</label>
            <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="Client VAT number" className={`${inputCls} placeholder:text-muted`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1">Postal Address</label>
          <textarea value={postalAddress} onChange={(e) => setPostalAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1">Physical Address</label>
          <textarea value={physicalAddress} onChange={(e) => setPhysicalAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
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
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RATE STRUCTURES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function RateStructuresTab({ clientId }: { clientId: string }) {
  const { data: rates, isLoading } = useClientRates(clientId)
  const createRate = useCreateClientRate(clientId)
  const updateRate = useUpdateClientRate(clientId)
  const deleteRate = useDeleteClientRate(clientId)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<RateType>('flat_fee')
  const [formAmount, setFormAmount] = useState('')
  const [formUnit, setFormUnit] = useState('')
  const [formApplies, setFormApplies] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const resetForm = () => {
    setFormName('')
    setFormType('flat_fee')
    setFormAmount('')
    setFormUnit('')
    setFormApplies('')
    setFormNotes('')
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (rate: ClientRate) => {
    setEditingId(rate.id)
    setFormName(rate.name)
    setFormType(rate.rate_type)
    setFormAmount(String(rate.amount))
    setFormUnit(rate.unit_label || '')
    setFormApplies(rate.applies_to || '')
    setFormNotes(rate.notes || '')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formAmount) return

    const payload = {
      name: formName.trim(),
      rate_type: formType,
      amount: parseFloat(formAmount),
      unit_label: formUnit.trim() || undefined,
      applies_to: formApplies || undefined,
      notes: formNotes.trim() || undefined,
    }

    try {
      if (editingId) {
        await updateRate.mutateAsync({ rateId: editingId, data: payload })
      } else {
        await createRate.mutateAsync(payload)
      }
      resetForm()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (rateId: string) => {
    if (!confirm('Delete this rate?')) return
    try {
      await deleteRate.mutateAsync(rateId)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate focus:outline-none focus:ring-2 focus:ring-accent'
  const selectCls = `${inputCls} bg-white`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-charcoal">Rate Structures</h2>
          <p className="text-sm text-muted mt-1">Billing rates for this client. Used when generating invoices.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95"
          >
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-charcoal">{editingId ? 'Edit Rate' : 'New Rate'}</h3>
            <button type="button" onClick={resetForm} className="text-muted hover:text-slate">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Standard Assessment Fee" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Rate Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as RateType)} className={selectCls}>
                {RATE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Amount</label>
              <input type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Unit Label</label>
              <input type="text" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="e.g. per hour, per km" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Applies To</label>
              <select value={formApplies} onChange={(e) => setFormApplies(e.target.value)} className={selectCls}>
                <option value="">All services</option>
                {RATE_APPLIES_TO_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Notes</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createRate.isPending || updateRate.isPending || !formName.trim() || !formAmount}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95 disabled:opacity-60"
            >
              {(createRate.isPending || updateRate.isPending) ? 'Saving...' : editingId ? 'Update Rate' : 'Create Rate'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-muted hover:text-slate">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !rates?.length ? (
        <div className="text-center py-12 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted">No rate structures configured</p>
          <p className="text-xs text-muted mt-1">Add billing rates for invoicing</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rates.map((rate) => (
            <div
              key={rate.id}
              className="flex items-center justify-between bg-white border border-[#D4CFC7] rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-charcoal">{rate.name}</span>
                  <span className="px-2 py-0.5 text-xs rounded bg-copper/10 text-copper capitalize">
                    {rate.rate_type.replace(/_/g, ' ')}
                  </span>
                  {rate.applies_to && (
                    <span className="px-2 py-0.5 text-xs rounded bg-[#F5F2EE] text-slate capitalize">
                      {rate.applies_to.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-bold text-charcoal">
                    {formatCurrency(Number(rate.amount))}
                  </span>
                  {rate.unit_label && (
                    <span className="text-xs text-muted">/ {rate.unit_label}</span>
                  )}
                  {rate.notes && (
                    <span className="text-xs text-muted truncate max-w-[200px]">{rate.notes}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <button
                  onClick={() => startEdit(rate)}
                  className="p-1.5 text-muted hover:text-accent rounded"
                  title="Edit rate"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(rate.id)}
                  className="p-1.5 text-muted hover:text-red-500 rounded"
                  title="Delete rate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENT RULES TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function ClientRulesTab({ clientId }: { clientId: string }) {
  const { data: rules, isLoading: rulesLoading } = useClientRules(clientId)
  const upsertRule = useUpsertClientRule()
  const deleteRule = useDeleteClientRule(clientId)

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-heading font-bold text-charcoal">Rules &amp; Configuration</h2>
        <p className="text-sm text-muted mt-1">
          Configure write-off thresholds, labour rates, settlement basis, and parts policy. These rules drive case assessments and reporting.
        </p>
      </div>

      {rulesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#F5F2EE] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MANDATE LIBRARY TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function MandateLibraryTab({ clientId }: { clientId: string }) {
  const { data: allCases } = useCases()
  const router = useRouter()

  const clientMandateIds = useMemo(() => {
    const ids = new Set<string>()
    ;(allCases || [])
      .filter((c) => c.client_id === clientId)
      .forEach((c) => {
        if (c.mandate_id) ids.add(c.mandate_id)
      })
    return ids
  }, [allCases, clientId])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-charcoal">Mandate Library</h2>
          <p className="text-sm text-muted mt-1">
            Mandates define the required checklist items for cases from this client.
          </p>
        </div>
        <Link
          href="/app/settings/assessment"
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95"
        >
          <BookOpen className="w-4 h-4" /> Mandate Builder
        </Link>
      </div>

      <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-6 text-center">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-charcoal font-medium mb-1">
          {clientMandateIds.size > 0
            ? `${clientMandateIds.size} mandate${clientMandateIds.size !== 1 ? 's' : ''} associated with this client`
            : 'No mandates linked yet'}
        </p>
        <p className="text-xs text-muted mb-4">
          Mandates are managed in the Settings &gt; Assessment section and linked to clients through cases.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/app/settings/assessment"
            className="px-4 py-2 text-sm text-accent border border-accent rounded-lg hover:bg-accent/5"
          >
            Go to Mandate Builder
          </Link>
          <Link
            href={`/app/cases?client=${clientId}`}
            className="px-4 py-2 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE]"
          >
            View Client Cases
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLIENT CASES MINI-DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   RULE EDITOR
   ═══════════════════════════════════════════════════════════════════════════ */

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
    if (meta.inputType === 'currency') return <span className="text-slate font-medium">{formatCurrency(Number(val))}</span>
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
            <button onClick={() => setIsEditing(true)} className="text-xs text-accent hover:underline">
              {existing ? 'Edit' : 'Set'}
            </button>
          )}
          {!isEditing && onDelete && (
            <button onClick={onDelete} className="text-xs text-red-500 hover:underline ml-2">
              Clear
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-2 flex gap-2 items-end">
          {meta.inputType === 'select' && ruleKey === 'settlement_basis' ? (
            <select value={localValue} onChange={(e) => setLocalValue(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate bg-white">
              <option value="">Select...</option>
              <option value="retail">Retail</option>
              <option value="trade">Trade</option>
              <option value="market">Market</option>
            </select>
          ) : meta.inputType === 'select' && ruleKey === 'parts_policy' ? (
            <select value={localValue} onChange={(e) => setLocalValue(e.target.value)} className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate bg-white">
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
          <button onClick={handleSave} disabled={isSaving || !localValue} className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-muted hover:text-slate">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="mt-1">{displayValue()}</div>
      )}
    </div>
  )
}
