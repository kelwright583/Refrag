import { NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { trackServerEvent } from '@/lib/events'

/** POST /api/org/complete-onboarding */
export async function POST() {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const { data: org } = await supabase
      .from('organisations')
      .select('report_pack_credits, onboarding_completed_at')
      .eq('id', orgId)
      .single()

    const alreadyOnboarded = !!org?.onboarding_completed_at

    const updates: Record<string, unknown> = {
      onboarding_completed_at: new Date().toISOString(),
    }

    if (!alreadyOnboarded) {
      updates.report_pack_credits = (org?.report_pack_credits ?? 0) + 3
    }

    const { error: dbError } = await supabase
      .from('organisations')
      .update(updates)
      .eq('id', orgId)

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ONBOARDING_COMPLETED',
      details: alreadyOnboarded ? {} : { free_credits_seeded: 3 },
    })

    trackServerEvent('onboarding_completed', {
      already_onboarded: alreadyOnboarded,
      free_credits_seeded: alreadyOnboarded ? 0 : 3,
    }, { orgId, userId: user.id })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
