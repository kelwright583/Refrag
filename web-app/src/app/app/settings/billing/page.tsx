'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────

interface UsageData {
  billingMode: 'credits' | 'subscription'
  billingStatus: string
  credits: number
  monthlyPackCount: number
  monthlyPackLimit: number | null
  planId: string | null
  hasStripeCustomer: boolean
  billingPeriodStart: string | null
  monthlyUsage: Array<{ month: string; count: number }>
  transactions: Array<{
    action: string
    details: Record<string, unknown>
    created_at: string
  }>
}

interface CreditBundle {
  id: string
  name: string
  credits: number
  stripePriceId: string
}

interface SubscriptionTier {
  id: string
  name: string
  packsPerMonth: number
  stripePriceId: string
}

// ── Static data (mirrors server plans — prices shown client-side only) ───

const CREDIT_BUNDLES: CreditBundle[] = [
  { id: 'credits_5', name: 'Starter', credits: 5, stripePriceId: '' },
  { id: 'credits_20', name: 'Standard', credits: 20, stripePriceId: '' },
  { id: 'credits_50', name: 'Value', credits: 50, stripePriceId: '' },
  { id: 'credits_100', name: 'Bulk', credits: 100, stripePriceId: '' },
]

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  { id: 'sub_starter', name: 'Starter', packsPerMonth: 20, stripePriceId: '' },
  { id: 'sub_professional', name: 'Professional', packsPerMonth: 75, stripePriceId: '' },
  { id: 'sub_studio', name: 'Studio', packsPerMonth: 200, stripePriceId: '' },
  { id: 'sub_enterprise', name: 'Enterprise', packsPerMonth: -1, stripePriceId: '' },
]

// ── Page component ───────────────────────────────────────────────────────

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'credits' | 'subscription'>('credits')
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/usage')
      if (!res.ok) throw new Error('Failed to load billing data')
      const data: UsageData = await res.json()
      setUsage(data)
      setActiveTab(data.billingMode)
    } catch {
      setToast('Could not load billing data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setToast('Payment successful — credits will appear shortly')
      window.history.replaceState({}, '', '/app/settings/billing')
      setTimeout(load, 2000)
    }
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function startCheckout(mode: 'credits' | 'subscription', priceId: string, quantity?: number) {
    setActionLoading(priceId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, priceId, quantity }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err: any) {
      setToast(err.message ?? 'Checkout failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function openPortal() {
    setActionLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err: any) {
      setToast(err.message ?? 'Could not open billing portal')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────

  if (loading || !usage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="h-9 w-64 bg-[#F5F2EE] rounded animate-pulse" />
          <div className="h-4 w-48 bg-[#F5F2EE] rounded animate-pulse mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#F5F2EE] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const isCreditsMode = usage.billingMode === 'credits'
  const limitPct =
    usage.monthlyPackLimit && usage.monthlyPackLimit > 0
      ? Math.min(100, Math.round((usage.monthlyPackCount / usage.monthlyPackLimit) * 100))
      : 0
  const maxUsage = Math.max(...usage.monthlyUsage.map((m) => m.count), 1)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-charcoal text-white rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Billing</h1>
        <p className="text-slate mt-1">Manage your plan, credits, and invoices</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-8 p-1 bg-[#F5F2EE] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'credits'
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-slate hover:text-charcoal'
          }`}
        >
          Pay-per-pack
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'subscription'
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-slate hover:text-charcoal'
          }`}
        >
          Subscription
        </button>
      </div>

      {/* ── Status banner ────────────────────────────────────────────── */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 mb-6">
        {isCreditsMode ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-slate">Current mode</p>
              <p className="text-lg font-heading font-semibold text-charcoal">Pay-per-pack credits</p>
              <p className="text-2xl font-bold text-copper mt-1">
                {usage.credits} <span className="text-base font-normal text-slate">credits remaining</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('credits')}
                className="px-4 py-2.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                Buy more credits
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className="px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm font-medium text-slate hover:bg-[#F5F2EE]"
              >
                Switch to subscription
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate">Current mode</p>
              <p className="text-lg font-heading font-semibold text-charcoal">
                {tierName(usage.planId)} subscription
                <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {usage.billingStatus}
                </span>
              </p>
              {usage.monthlyPackLimit && usage.monthlyPackLimit > 0 && (
                <div className="mt-3 max-w-md">
                  <div className="flex justify-between text-xs text-slate mb-1">
                    <span>Packs this month: {usage.monthlyPackCount} / {usage.monthlyPackLimit}</span>
                    <span>{limitPct}%</span>
                  </div>
                  <div className="h-2.5 bg-[#F5F2EE] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${limitPct}%`,
                        backgroundColor: limitPct >= 90 ? '#C72A00' : '#A0522D',
                      }}
                    />
                  </div>
                </div>
              )}
              {usage.billingPeriodStart && (
                <p className="text-xs text-muted mt-2">
                  Billing period started {new Date(usage.billingPeriodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {usage.hasStripeCustomer && (
                <button
                  onClick={openPortal}
                  disabled={actionLoading === 'portal'}
                  className="px-4 py-2.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === 'portal' ? 'Opening…' : 'Manage subscription'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('credits')}
                className="px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm font-medium text-slate hover:bg-[#F5F2EE]"
              >
                Switch to pay-per-pack
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Credit bundles ───────────────────────────────────────────── */}
      {activeTab === 'credits' && (
        <section className="mb-8">
          <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">Buy credit packs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white border border-[#D4CFC7] rounded-xl p-5 flex flex-col hover:border-copper/40 transition-colors"
              >
                <p className="text-sm text-slate font-medium">{bundle.name}</p>
                <p className="text-3xl font-bold text-charcoal mt-1">{bundle.credits}</p>
                <p className="text-xs text-muted mt-0.5 mb-4">report pack credits</p>
                <button
                  onClick={() => startCheckout('credits', bundle.stripePriceId)}
                  disabled={!!actionLoading}
                  className="mt-auto w-full px-4 py-2.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === bundle.stripePriceId ? 'Redirecting…' : 'Purchase'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Subscription tiers ───────────────────────────────────────── */}
      {activeTab === 'subscription' && (
        <section className="mb-8">
          <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">Subscription plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isCurrent = usage.planId === tier.id
              return (
                <div
                  key={tier.id}
                  className={`bg-white border rounded-xl p-5 flex flex-col transition-colors ${
                    isCurrent ? 'border-copper ring-1 ring-copper/30' : 'border-[#D4CFC7] hover:border-copper/40'
                  }`}
                >
                  <p className="text-sm text-slate font-medium">{tier.name}</p>
                  {tier.packsPerMonth > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-charcoal mt-1">{tier.packsPerMonth}</p>
                      <p className="text-xs text-muted mt-0.5 mb-4">packs / month</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-charcoal mt-1">Unlimited</p>
                      <p className="text-xs text-muted mt-0.5 mb-4">custom agreement</p>
                    </>
                  )}
                  {isCurrent ? (
                    <div className="mt-auto w-full px-4 py-2.5 bg-[#F5F2EE] text-charcoal rounded-lg text-sm font-medium text-center">
                      Current plan
                    </div>
                  ) : tier.packsPerMonth > 0 ? (
                    <button
                      onClick={() => startCheckout('subscription', tier.stripePriceId)}
                      disabled={!!actionLoading}
                      className="mt-auto w-full px-4 py-2.5 bg-charcoal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading === tier.stripePriceId ? 'Redirecting…' : 'Subscribe'}
                    </button>
                  ) : (
                    <a
                      href="mailto:hello@refrag.co?subject=Enterprise enquiry"
                      className="mt-auto w-full px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm font-medium text-center text-slate hover:bg-[#F5F2EE] block"
                    >
                      Contact sales
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Usage graph ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">Packs generated — last 6 months</h2>
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-6">
          <svg viewBox="0 0 600 180" className="w-full h-auto" role="img" aria-label="Monthly usage bar chart">
            {usage.monthlyUsage.map((m, i) => {
              const barH = maxUsage > 0 ? (m.count / maxUsage) * 130 : 0
              const x = 20 + i * 96
              return (
                <g key={m.month}>
                  <rect
                    x={x}
                    y={140 - barH}
                    width={60}
                    height={barH}
                    rx={6}
                    fill="#A0522D"
                    opacity={0.85}
                  />
                  <text x={x + 30} y={156} textAnchor="middle" className="text-[11px]" fill="#6B7280">
                    {formatMonth(m.month)}
                  </text>
                  {m.count > 0 && (
                    <text x={x + 30} y={135 - barH} textAnchor="middle" className="text-[11px] font-medium" fill="#30313A">
                      {m.count}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1="16" y1="141" x2="596" y2="141" stroke="#D4CFC7" strokeWidth="1" />
          </svg>
        </div>
      </section>

      {/* ── Billing history ──────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-charcoal">Recent activity</h2>
          {usage.hasStripeCustomer && (
            <button
              onClick={openPortal}
              disabled={actionLoading === 'portal'}
              className="text-sm text-copper hover:underline disabled:opacity-50"
            >
              View all invoices →
            </button>
          )}
        </div>
        <div className="bg-white border border-[#D4CFC7] rounded-xl divide-y divide-[#F0EDE8]">
          {usage.transactions.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">No billing activity yet</div>
          )}
          {usage.transactions.map((tx, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm text-charcoal font-medium">{actionLabel(tx.action)}</p>
                <p className="text-xs text-muted mt-0.5">{actionDetail(tx)}</p>
              </div>
              <time className="text-xs text-muted whitespace-nowrap">
                {new Date(tx.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
            </div>
          ))}
        </div>
      </section>

      {/* ── Card management ──────────────────────────────────────────── */}
      {usage.hasStripeCustomer && (
        <section className="mb-8">
          <div className="bg-[#F5F2EE] border border-[#D4CFC7] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-charcoal">Payment methods &amp; invoices</p>
              <p className="text-xs text-muted mt-0.5">
                Update your card, download invoices, and manage billing details via the Stripe portal
              </p>
            </div>
            <button
              onClick={openPortal}
              disabled={actionLoading === 'portal'}
              className="px-5 py-2.5 bg-charcoal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {actionLoading === 'portal' ? 'Opening…' : 'Open billing portal'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function tierName(planId: string | null): string {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === planId)
  return tier?.name ?? 'Subscription'
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREDITS_TOPPED_UP: 'Credits purchased',
    CREDIT_DEDUCTED: 'Pack generated (credit)',
    SUBSCRIPTION_PACK_USED: 'Pack generated (subscription)',
    OVERAGE_CREDIT_DEDUCTED: 'Pack generated (overage)',
    SUBSCRIPTION_INVOICE_PAID: 'Subscription renewed',
    CHECKOUT_COMPLETED: 'Checkout completed',
    SUBSCRIPTION_CANCELED: 'Subscription cancelled',
  }
  return labels[action] ?? action
}

function actionDetail(tx: { action: string; details: Record<string, unknown> }): string {
  const d = tx.details
  if (tx.action === 'CREDITS_TOPPED_UP') return `+${d.added ?? '?'} credits → ${d.newTotal ?? '?'} total`
  if (tx.action === 'CREDIT_DEDUCTED') return `${d.remaining ?? '?'} credits remaining`
  if (tx.action === 'SUBSCRIPTION_PACK_USED') return `${d.monthlyUsed ?? '?'} / ${d.monthlyLimit ?? '?'} used`
  if (tx.action === 'OVERAGE_CREDIT_DEDUCTED') return `Overage — ${d.remaining ?? '?'} credits left`
  return ''
}
