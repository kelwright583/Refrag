import { createServiceClient } from '@/lib/supabase/service'
import { trackServerEvent } from '@/lib/events'

export type CreditGateResult =
  | { status: 'ok'; creditsRemaining?: number; monthlyUsed?: number; monthlyLimit?: number }
  | { status: 'no_credits' }
  | { status: 'subscription_limit' }
  | { status: 'not_active' }

/**
 * Atomically check whether an org may generate a report pack, and deduct one
 * credit / increment the monthly counter.  This is the single source of truth
 * for pack-generation gating.
 */
export async function checkAndDeductPackCredit(
  orgId: string,
  actorUserId?: string,
): Promise<CreditGateResult> {
  const sb = createServiceClient()

  const { data: org, error: fetchErr } = await sb
    .from('organisations')
    .select(
      'billing_mode, billing_status, report_pack_credits, monthly_pack_count, monthly_pack_limit',
    )
    .eq('id', orgId)
    .single()

  if (fetchErr || !org) {
    return { status: 'not_active' }
  }

  const mode: string = org.billing_mode ?? 'credits'
  const billingStatus: string = org.billing_status ?? 'trialing'

  // ── Credits mode ──────────────────────────────────────────────────────
  if (mode === 'credits') {
    const credits: number = org.report_pack_credits ?? 0
    if (credits <= 0) return { status: 'no_credits' }

    // Atomic decrement — only succeeds if credits > 0
    const { data: updated, error: decErr } = await sb
      .from('organisations')
      .update({ report_pack_credits: credits - 1 })
      .eq('id', orgId)
      .gte('report_pack_credits', 1)
      .select('report_pack_credits')
      .single()

    if (decErr || !updated) return { status: 'no_credits' }

    await writeAudit(sb, orgId, actorUserId, 'CREDIT_DEDUCTED', {
      remaining: updated.report_pack_credits,
    })

    trackServerEvent('report_pack_paid', {
      billing_mode: 'credits',
      credits_remaining: updated.report_pack_credits,
    }, { orgId, userId: actorUserId })

    return { status: 'ok', creditsRemaining: updated.report_pack_credits }
  }

  // ── Subscription mode ─────────────────────────────────────────────────
  if (!['active', 'trialing'].includes(billingStatus)) {
    return { status: 'not_active' }
  }

  const used: number = org.monthly_pack_count ?? 0
  const limit: number = org.monthly_pack_limit ?? 0

  if (limit > 0 && used >= limit) {
    // Over subscription limit — attempt overage credit deduction
    const credits: number = org.report_pack_credits ?? 0
    if (credits <= 0) return { status: 'subscription_limit' }

    const { data: updated, error: decErr } = await sb
      .from('organisations')
      .update({
        report_pack_credits: credits - 1,
        monthly_pack_count: used + 1,
      })
      .eq('id', orgId)
      .gte('report_pack_credits', 1)
      .select('report_pack_credits, monthly_pack_count')
      .single()

    if (decErr || !updated) return { status: 'subscription_limit' }

    await writeAudit(sb, orgId, actorUserId, 'OVERAGE_CREDIT_DEDUCTED', {
      remaining: updated.report_pack_credits,
      monthlyUsed: updated.monthly_pack_count,
      monthlyLimit: limit,
    })

    trackServerEvent('report_pack_paid', {
      billing_mode: 'subscription_overage',
      credits_remaining: updated.report_pack_credits,
      monthly_used: updated.monthly_pack_count,
      monthly_limit: limit,
    }, { orgId, userId: actorUserId })

    return {
      status: 'ok',
      creditsRemaining: updated.report_pack_credits,
      monthlyUsed: updated.monthly_pack_count,
      monthlyLimit: limit,
    }
  }

  // Within subscription limit — increment counter
  const { data: updated, error: incErr } = await sb
    .from('organisations')
    .update({ monthly_pack_count: used + 1 })
    .eq('id', orgId)
    .select('monthly_pack_count')
    .single()

  if (incErr || !updated) return { status: 'not_active' }

  await writeAudit(sb, orgId, actorUserId, 'SUBSCRIPTION_PACK_USED', {
    monthlyUsed: updated.monthly_pack_count,
    monthlyLimit: limit,
  })

  trackServerEvent('report_pack_paid', {
    billing_mode: 'subscription',
    monthly_used: updated.monthly_pack_count,
    monthly_limit: limit,
  }, { orgId, userId: actorUserId })

  return {
    status: 'ok',
    monthlyUsed: updated.monthly_pack_count,
    monthlyLimit: limit,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function writeAudit(
  sb: ReturnType<typeof createServiceClient>,
  orgId: string,
  actorUserId: string | undefined,
  action: string,
  details: Record<string, unknown>,
) {
  await sb.from('audit_log').insert({
    org_id: orgId,
    actor_user_id: actorUserId ?? '00000000-0000-0000-0000-000000000000',
    action,
    details,
  })
}
