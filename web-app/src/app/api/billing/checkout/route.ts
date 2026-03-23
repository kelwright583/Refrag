import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getPaymentAdapter } from '@/lib/adapters/payment'
import { getCreditBundles, getSubscriptionTiers } from '@/lib/billing/plans'
import { z } from 'zod'

const checkoutSchema = z.object({
  mode: z.enum(['credits', 'subscription']),
  priceId: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    const raw = await req.json()
    const parseResult = checkoutSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const { mode, priceId, quantity } = parseResult.data

    if (mode === 'credits') {
      const bundle = getCreditBundles().find((b) => b.stripePriceId === priceId)
      if (!bundle) return serverError('Invalid credit price ID', 400)
    } else if (mode === 'subscription') {
      const tier = getSubscriptionTiers().find((t) => t.stripePriceId === priceId)
      if (!tier) return serverError('Invalid subscription price ID', 400)
    } else {
      return serverError('mode must be "credits" or "subscription"', 400)
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
    const adapter = getPaymentAdapter()

    const { url } = await adapter.createCheckoutSession({
      orgId: orgId!,
      mode: mode as 'credits' | 'subscription',
      priceId,
      quantity,
      successUrl: `${origin}/app/settings/billing?checkout=success`,
      cancelUrl: `${origin}/app/settings/billing?checkout=cancel`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    return serverError(err.message)
  }
}
