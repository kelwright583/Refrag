import { NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

export async function GET() {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error ?? serverError('Unauthorized', 401)

    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .select(
        'billing_mode, billing_status, report_pack_credits, monthly_pack_count, monthly_pack_limit, plan_id, billing_customer_id, billing_period_start',
      )
      .eq('id', orgId)
      .single()

    if (orgErr || !org) return serverError('Organisation not found', 404)

    // Last 6 months usage from audit_log (packs generated per month)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: logs } = await supabase
      .from('audit_log')
      .select('action, created_at')
      .eq('org_id', orgId)
      .in('action', ['CREDIT_DEDUCTED', 'SUBSCRIPTION_PACK_USED', 'OVERAGE_CREDIT_DEDUCTED'])
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true })

    const monthlyUsage = buildMonthlyUsage(logs ?? [])

    // Recent transactions (last 12)
    const { data: transactions } = await supabase
      .from('audit_log')
      .select('action, details, created_at')
      .eq('org_id', orgId)
      .in('action', [
        'CREDITS_TOPPED_UP',
        'CREDIT_DEDUCTED',
        'SUBSCRIPTION_PACK_USED',
        'OVERAGE_CREDIT_DEDUCTED',
        'SUBSCRIPTION_INVOICE_PAID',
        'CHECKOUT_COMPLETED',
        'SUBSCRIPTION_CANCELED',
      ])
      .order('created_at', { ascending: false })
      .limit(12)

    return NextResponse.json({
      billingMode: org.billing_mode ?? 'credits',
      billingStatus: org.billing_status ?? 'trialing',
      credits: org.report_pack_credits ?? 0,
      monthlyPackCount: org.monthly_pack_count ?? 0,
      monthlyPackLimit: org.monthly_pack_limit ?? null,
      planId: org.plan_id ?? null,
      hasStripeCustomer: !!org.billing_customer_id,
      billingPeriodStart: org.billing_period_start ?? null,
      monthlyUsage,
      transactions: transactions ?? [],
    })
  } catch (err: any) {
    return serverError(err.message)
  }
}

function buildMonthlyUsage(
  logs: Array<{ action: string; created_at: string }>,
): Array<{ month: string; count: number }> {
  const buckets = new Map<string, number>()

  // Pre-fill last 6 months so the graph always has 6 bars
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, 0)
  }

  for (const log of logs) {
    const d = new Date(log.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }))
}
