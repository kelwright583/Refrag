import { NextRequest, NextResponse } from 'next/server'
import { getPaymentAdapter } from '@/lib/adapters/payment'
import { createServiceClient } from '@/lib/supabase/service'
import { bundleByPriceId, tierByPriceId } from '@/lib/billing/plans'

/**
 * Stripe webhook handler.
 * Uses raw body for signature verification — do NOT parse JSON before verify.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: { type: string; data: Record<string, unknown> }

  try {
    const adapter = getPaymentAdapter()
    event = await adapter.handleWebhook(rawBody, signature)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sb = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(sb, event.data)
        break
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(sb, event.data)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePayment(sb, event.data)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(sb, event.data)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(sb, event.data)
        break
      default:
        break
    }
  } catch (err: any) {
    console.error(`[Webhook] Error handling ${event.type}:`, err.message)
  }

  return NextResponse.json({ received: true })
}

// ── Event handlers ────────────────────────────────────────────────────────

type SB = ReturnType<typeof createServiceClient>

async function handleCheckoutComplete(sb: SB, data: Record<string, unknown>) {
  const orgId = (data.metadata as Record<string, string>)?.org_id
  const customerId = data.customer as string | undefined
  const mode = (data.metadata as Record<string, string>)?.mode

  if (!orgId) return

  if (customerId) {
    await sb
      .from('organisations')
      .update({ billing_customer_id: customerId })
      .eq('id', orgId)
  }

  if (mode === 'credits') {
    const lineItems = data.line_items as { data?: Array<{ price?: { id: string }; quantity?: number }> } | undefined
    const item = lineItems?.data?.[0]
    if (item?.price?.id) {
      const bundle = bundleByPriceId(item.price.id)
      if (bundle) {
        await topUpCredits(sb, orgId, bundle.credits)
      }
    }
  }

  await audit(sb, orgId, 'CHECKOUT_COMPLETED', { mode, customerId })
}

async function handlePaymentSucceeded(sb: SB, data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, string> | undefined
  const orgId = metadata?.org_id
  if (!orgId) return

  const mode = metadata?.mode
  if (mode !== 'credits') return

  const priceId = metadata?.price_id
  if (priceId) {
    const bundle = bundleByPriceId(priceId)
    if (bundle) {
      await topUpCredits(sb, orgId, bundle.credits)
    }
  }

  await audit(sb, orgId, 'PAYMENT_SUCCEEDED', { amount: data.amount })
}

async function handleInvoicePayment(sb: SB, data: Record<string, unknown>) {
  const subId = data.subscription as string | undefined
  if (!subId) return

  const { data: org } = await sb
    .from('organisations')
    .select('id')
    .eq('billing_subscription_id', subId)
    .single()

  if (!org) return

  await sb
    .from('organisations')
    .update({
      monthly_pack_count: 0,
      billing_status: 'active',
      billing_period_start: new Date().toISOString(),
    })
    .eq('id', org.id)

  await audit(sb, org.id, 'SUBSCRIPTION_INVOICE_PAID', { subscriptionId: subId })
}

async function handleSubscriptionUpdated(sb: SB, data: Record<string, unknown>) {
  const subId = data.id as string
  const status = data.status as string
  const items = data.items as { data?: Array<{ price?: { id: string } }> } | undefined
  const priceId = items?.data?.[0]?.price?.id

  const { data: org } = await sb
    .from('organisations')
    .select('id')
    .eq('billing_subscription_id', subId)
    .single()

  if (!org) return

  const updates: Record<string, unknown> = {
    billing_status: mapStripeStatus(status),
  }

  if (priceId) {
    const tier = tierByPriceId(priceId)
    if (tier) {
      updates.plan_id = tier.id
      updates.monthly_pack_limit = tier.packsPerMonth > 0 ? tier.packsPerMonth : null
    }
  }

  await sb.from('organisations').update(updates).eq('id', org.id)
  await audit(sb, org.id, 'SUBSCRIPTION_UPDATED', { subId, status, priceId })
}

async function handleSubscriptionDeleted(sb: SB, data: Record<string, unknown>) {
  const subId = data.id as string

  const { data: org } = await sb
    .from('organisations')
    .select('id')
    .eq('billing_subscription_id', subId)
    .single()

  if (!org) return

  await sb
    .from('organisations')
    .update({
      billing_mode: 'credits',
      billing_status: 'canceled',
      billing_subscription_id: null,
      plan_id: null,
      monthly_pack_limit: null,
    })
    .eq('id', org.id)

  await audit(sb, org.id, 'SUBSCRIPTION_CANCELED', { subId })
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function topUpCredits(sb: SB, orgId: string, amount: number) {
  const { data: org } = await sb
    .from('organisations')
    .select('report_pack_credits')
    .eq('id', orgId)
    .single()

  const current = org?.report_pack_credits ?? 0

  await sb
    .from('organisations')
    .update({ report_pack_credits: current + amount })
    .eq('id', orgId)

  await audit(sb, orgId, 'CREDITS_TOPPED_UP', { added: amount, newTotal: current + amount })
}

function mapStripeStatus(s: string): string {
  if (s === 'active' || s === 'trialing') return s
  if (s === 'past_due') return 'past_due'
  return 'canceled'
}

async function audit(
  sb: SB,
  orgId: string,
  action: string,
  details: Record<string, unknown>,
) {
  await sb.from('audit_log').insert({
    org_id: orgId,
    actor_user_id: '00000000-0000-0000-0000-000000000000',
    action,
    details,
  })
}
