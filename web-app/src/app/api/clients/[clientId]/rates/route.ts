import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbErr } = await supabase
      .from('client_rate_structures')
      .select('*')
      .eq('client_id', clientId)
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (dbErr) throw dbErr
    return NextResponse.json(data || [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const raw = await request.json()
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data as any
    const { name, rate_type, amount, currency_code, unit_label, applies_to, notes } = body

    if (!name || !rate_type || amount == null) {
      return serverError('name, rate_type, and amount are required', 400)
    }

    const { data: org } = await supabase
      .from('organisations')
      .select('currency_code')
      .eq('id', orgId)
      .single()

    const { data, error: dbErr } = await supabase
      .from('client_rate_structures')
      .insert({
        org_id: orgId,
        client_id: clientId,
        name,
        rate_type,
        amount: Number(amount),
        currency_code: currency_code || org?.currency_code || 'USD',
        unit_label: unit_label || null,
        applies_to: applies_to || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
