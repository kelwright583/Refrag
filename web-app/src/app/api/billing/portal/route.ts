import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getPaymentAdapter } from '@/lib/adapters/payment'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    const body = await req.json()
    const returnUrl: string =
      body.returnUrl ??
      `${req.headers.get('origin') ?? ''}/app/settings/billing`

    const sb = createServiceClient()
    const { data: org } = await sb
      .from('organisations')
      .select('billing_customer_id')
      .eq('id', orgId)
      .single()

    if (!org?.billing_customer_id) {
      return serverError('No Stripe customer linked to this organisation', 400)
    }

    const adapter = getPaymentAdapter()
    const { url } = await adapter.createBillingPortalSession(
      org.billing_customer_id,
      returnUrl,
    )

    return NextResponse.json({ url })
  } catch (err: any) {
    return serverError(err.message)
  }
}
