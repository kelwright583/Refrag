import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

export async function GET() {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { data, error } = await supabase
      .from('assessment_rates')
      .select('*')
      .eq('org_id', orgId)
      .order('rate_type')
      .order('rate_name')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
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

    const { data, error } = await supabase
      .from('assessment_rates')
      .insert({
        org_id: orgId,
        rate_name: body.rate_name,
        rate_type: body.rate_type || 'desktop',
        amount: Number(body.amount) || 0,
        is_inclusive: body.is_inclusive !== false,
        vat_pct: Number(body.vat_pct) ?? 15,
        is_active: body.is_active !== false,
        notes: body.notes || null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
