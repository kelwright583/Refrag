/**
 * GET: single inbound email. PATCH: assign org, create case, or reject.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { orgId } = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('inbound_emails')
      .select('*')
      .eq('id', params.id)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { orgId, userId } = await getUserOrgId(supabase)
    const body = await request.json()

    const { data: inbound, error: fetchErr } = await supabase
      .from('inbound_emails')
      .select('*')
      .eq('id', params.id)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .single()

    if (fetchErr || !inbound) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.action === 'reject') {
      const { error } = await supabase.from('inbound_emails').update({ status: 'rejected', org_id: orgId }).eq('id', params.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'create_case') {
      const { data: org } = await supabase.from('organisations').select('slug').eq('id', orgId).single()
      if (!org) throw new Error('Org not found')
      const { data: seqResult, error: seqError } = await supabase.rpc('get_next_case_number', { p_org_id: orgId, p_org_slug: org.slug })
      const case_number = seqError ? `${org.slug.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}` : seqResult
      const parsed = (inbound.parsed_json || {}) as Record<string, unknown>
      const { data: newCase, error: caseErr } = await supabase
        .from('cases')
        .insert({
          org_id: orgId,
          created_by: userId,
          case_number,
          client_name: (parsed.insured_name as string) || 'From email',
          insurer_reference: (parsed.insurer_reference as string) || null,
          location: (parsed.address as string) || null,
          status: 'draft',
          priority: 'normal',
        })
        .select()
        .single()
      if (caseErr) throw caseErr

      const { error: up } = await supabase
        .from('inbound_emails')
        .update({ org_id: orgId, case_id: newCase.id, status: 'case_created' })
        .eq('id', params.id)
      if (up) throw up

      return NextResponse.json({ case_id: newCase.id, case_number: newCase.case_number })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
