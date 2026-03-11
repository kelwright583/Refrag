import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getAuthContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, orgId: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!orgMember) {
    return { supabase, user, orgId: null, error: NextResponse.json({ error: 'No organisation found' }, { status: 403 }) }
  }

  return { supabase, user, orgId: orgMember.org_id as string, error: null }
}

export function serverError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}
