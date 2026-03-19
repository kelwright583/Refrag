export interface CreditBundle {
  id: string
  name: string
  credits: number
  stripePriceId: string
}

export interface SubscriptionTier {
  id: string
  name: string
  packsPerMonth: number
  stripePriceId: string
  overageRate: 'standard' | 'discounted' | 'bulk'
}

export function getCreditBundles(): CreditBundle[] {
  return [
    {
      id: 'credits_5',
      name: 'Starter',
      credits: 5,
      stripePriceId: process.env.STRIPE_CREDIT_PRICE_ID_5 ?? '',
    },
    {
      id: 'credits_20',
      name: 'Standard',
      credits: 20,
      stripePriceId: process.env.STRIPE_CREDIT_PRICE_ID_20 ?? '',
    },
    {
      id: 'credits_50',
      name: 'Value',
      credits: 50,
      stripePriceId: process.env.STRIPE_CREDIT_PRICE_ID_50 ?? '',
    },
    {
      id: 'credits_100',
      name: 'Bulk',
      credits: 100,
      stripePriceId: process.env.STRIPE_CREDIT_PRICE_ID_100 ?? '',
    },
  ]
}

export function getSubscriptionTiers(): SubscriptionTier[] {
  return [
    {
      id: 'sub_starter',
      name: 'Starter',
      packsPerMonth: 20,
      stripePriceId: process.env.STRIPE_SUB_PRICE_STARTER ?? '',
      overageRate: 'standard',
    },
    {
      id: 'sub_professional',
      name: 'Professional',
      packsPerMonth: 75,
      stripePriceId: process.env.STRIPE_SUB_PRICE_PROFESSIONAL ?? '',
      overageRate: 'discounted',
    },
    {
      id: 'sub_studio',
      name: 'Studio',
      packsPerMonth: 200,
      stripePriceId: process.env.STRIPE_SUB_PRICE_STUDIO ?? '',
      overageRate: 'bulk',
    },
    {
      id: 'sub_enterprise',
      name: 'Enterprise',
      packsPerMonth: -1,
      stripePriceId: process.env.STRIPE_SUB_PRICE_ENTERPRISE ?? '',
      overageRate: 'bulk',
    },
  ]
}

/** Map a Stripe price ID back to the credit bundle it belongs to */
export function bundleByPriceId(priceId: string): CreditBundle | undefined {
  return getCreditBundles().find((b) => b.stripePriceId === priceId)
}

/** Map a Stripe price ID back to the subscription tier it belongs to */
export function tierByPriceId(priceId: string): SubscriptionTier | undefined {
  return getSubscriptionTiers().find((t) => t.stripePriceId === priceId)
}
