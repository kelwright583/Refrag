import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { StripeAdapter } from '@/lib/adapters/payment'

/**
 * Stripe webhook handler at /api/webhooks/stripe.
 * Verifies the Stripe signature before processing any event.
 * Uses raw body — do NOT parse JSON before verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: { type: string; data: Record<string, unknown> }

  try {
    event = await StripeAdapter.constructEvent(rawBody, signature)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[Stripe webhook] Signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data as {
          id?: string
          customer?: string
          subscription?: string
          metadata?: Record<string, string>
        }
        const orgId = session.metadata?.org_id
        if (!orgId) break

        await supabase
          .from('org_billing')
          .upsert(
            {
              org_id: orgId,
              subscription_status: 'active',
              stripe_subscription_id: session.subscription ?? null,
              stripe_customer_id: session.customer ?? null,
            },
            { onConflict: 'org_id' },
          )
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data as {
          id?: string
          status?: string
          customer?: string
        }
        if (!sub.id) break

        const stripeStatus = sub.status ?? 'active'
        const subscriptionStatus =
          stripeStatus === 'active' || stripeStatus === 'trialing'
            ? 'active'
            : stripeStatus === 'past_due'
              ? 'past_due'
              : 'cancelled'

        await supabase
          .from('org_billing')
          .update({ subscription_status: subscriptionStatus })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data as { id?: string }
        if (!sub.id) break

        await supabase
          .from('org_billing')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data as { subscription?: string }
        if (!invoice.subscription) break

        await supabase
          .from('org_billing')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription)
        break
      }

      default:
        break
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Stripe webhook] Error handling ${event.type}:`, message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
