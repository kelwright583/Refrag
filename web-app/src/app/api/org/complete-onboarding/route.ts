import { NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

/** POST /api/org/complete-onboarding */
export async function POST() {
  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const { error: dbError } = await supabase
      .from('organisations')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', orgId)

    if (dbError) throw dbError

    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      action: 'ONBOARDING_COMPLETED',
      details: {},
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return serverError(err.message)
  }
}
