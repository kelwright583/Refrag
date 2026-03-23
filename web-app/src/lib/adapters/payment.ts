export interface CheckoutOptions {
  orgId: string
  mode: 'credits' | 'subscription'
  priceId: string
  quantity?: number
  successUrl: string
  cancelUrl: string
}

export type WebhookEvent = {
  type: string
  data: Record<string, unknown>
}

export interface PaymentAdapter {
  createCheckoutSession(options: CheckoutOptions): Promise<{ url: string }>
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>
  createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }>
}

// ---------------------------------------------------------------------------
// Stripe — production payment processing
// ---------------------------------------------------------------------------

export class StripeAdapter implements PaymentAdapter {
  private apiKey: string
  private webhookSecret: string

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('StripeAdapter requires STRIPE_SECRET_KEY env var')
    }
    this.apiKey = key
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  }

  private async getClient() {
    const Stripe = (await import('stripe')).default
    return new Stripe(this.apiKey)
  }

  async createCheckoutSession(
    options: CheckoutOptions,
  ): Promise<{ url: string }> {
    const stripe = await this.getClient()

    const session = await stripe.checkout.sessions.create({
      mode: options.mode === 'subscription' ? 'subscription' : 'payment',
      line_items: [
        {
          price: options.priceId,
          quantity: options.quantity ?? 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: {
        org_id: options.orgId,
        mode: options.mode,
      },
    })

    if (!session.url) {
      throw new Error('Stripe checkout session created without a URL')
    }

    return { url: session.url }
  }

  async handleWebhook(
    rawBody: string,
    signature: string,
  ): Promise<WebhookEvent> {
    const stripe = await this.getClient()

    if (!this.webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET not set — cannot verify webhook signature',
      )
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    )

    return {
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    }
  }

  /**
   * Static helper for webhook routes that need to verify and parse a Stripe
   * event without instantiating the full adapter.
   */
  static async constructEvent(
    rawBody: string,
    signature: string,
  ): Promise<WebhookEvent> {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required')
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey)
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    return {
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    }
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const stripe = await this.getClient()

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  }
}

// ---------------------------------------------------------------------------
// Stub — simulates payment flows for development
// ---------------------------------------------------------------------------

export class StubPaymentAdapter implements PaymentAdapter {
  async createCheckoutSession(
    options: CheckoutOptions,
  ): Promise<{ url: string }> {
    console.log('[Payment stub] createCheckoutSession', {
      orgId: options.orgId,
      mode: options.mode,
      priceId: options.priceId,
    })
    return { url: options.successUrl }
  }

  async handleWebhook(
    _rawBody: string,
    _signature: string,
  ): Promise<WebhookEvent> {
    console.log('[Payment stub] handleWebhook — returning mock event')
    return { type: 'checkout.session.completed', data: { id: 'stub_session' } }
  }

  async createBillingPortalSession(
    _customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    console.log('[Payment stub] createBillingPortalSession')
    return { url: returnUrl }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getPaymentAdapter(): PaymentAdapter {
  if (process.env.STRIPE_SECRET_KEY) {
    return new StripeAdapter()
  }
  console.warn('[Payment] STRIPE_SECRET_KEY not set — using stub adapter.')
  return new StubPaymentAdapter()
}
