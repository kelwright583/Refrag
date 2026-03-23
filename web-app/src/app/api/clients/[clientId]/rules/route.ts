/**
 * Client Rules API - list and upsert
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

async function getUserOrgId(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) throw new Error('No organization found for user')
  return orgMember.org_id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('client_rules')
      .select('*')
      .eq('client_id', clientId)
      .eq('org_id', orgId)
      .order('rule_key', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as any

    if (!body.rule_key || body.rule_value === undefined) {
      return NextResponse.json({ error: 'rule_key and rule_value are required' }, { status: 400 })
    }

    // Upsert: insert or update on conflict (client_id, rule_key)
    const { data, error } = await supabase
      .from('client_rules')
      .upsert(
        {
          org_id: orgId,
          client_id: clientId,
          rule_key: body.rule_key,
          rule_value: body.rule_value,
          description: body.description || null,
        },
        { onConflict: 'client_id,rule_key' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
