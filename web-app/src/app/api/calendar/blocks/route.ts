/**
 * Calendar blocks API — list and create
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organization found')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const from = request.nextUrl.searchParams.get('from') || new Date().toISOString()
    const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 30 * 86400000).toISOString()

    const { data, error } = await supabase
      .from('calendar_blocks')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .gte('ends_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const body = await request.json()

    if (!body.starts_at || !body.ends_at) {
      return NextResponse.json({ error: 'starts_at and ends_at are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('calendar_blocks')
      .insert({
        org_id: orgId,
        user_id: userId,
        block_type: body.block_type || 'personal',
        title: body.title || null,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
