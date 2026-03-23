/**
 * Calendar block API — update and delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

async function getAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organization found')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as any

    const updates: Record<string, unknown> = {}
    if (body.block_type) updates.block_type = body.block_type
    if (body.title !== undefined) updates.title = body.title
    if (body.starts_at) updates.starts_at = body.starts_at
    if (body.ends_at) updates.ends_at = body.ends_at
    if (body.notes !== undefined) updates.notes = body.notes

    const { data, error } = await supabase
      .from('calendar_blocks')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)

    const { error } = await supabase
      .from('calendar_blocks')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
