/**
 * Single client API - get, update, delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateClientInput } from '@/lib/types/client'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
}).strict()

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
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.clientId)
      .eq('org_id', orgId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const raw = await request.json()
    const parseResult = updateClientSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data

    const { data, error } = await supabase
      .from('clients')
      .update(body)
      .eq('id', params.clientId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', params.clientId)
      .eq('org_id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
