/**
 * Notification Rules API — list and upsert
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

async function getUserOrgId(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organization found for user')
  return orgMember.org_id
}

export async function GET() {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('org_id', orgId)
      .order('to_status', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as any

    if (!body.to_status) {
      return NextResponse.json({ error: 'to_status is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notification_rules')
      .upsert(
        {
          org_id: orgId,
          from_status: body.from_status || null,
          to_status: body.to_status,
          is_enabled: body.is_enabled ?? true,
          auto_send: body.auto_send ?? false,
          template_id: body.template_id || null,
          default_recipients: body.default_recipients || ['client', 'broker'],
        },
        { onConflict: 'org_id,from_status,to_status' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
