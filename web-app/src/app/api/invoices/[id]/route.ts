import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, case:cases(id, case_number, client_name, claim_reference, vehicle_registration, vehicle_manufacturer, vehicle_model, assessment_type), client:clients(id, name, vat_number, postal_address, physical_address, contact_email)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (error || !invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .eq('org_id', orgId)
      .order('order_index')

    return NextResponse.json({ ...invoice, line_items: lineItems || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const allowedFields = [
      'status', 'issued_at', 'due_at', 'reference', 'date', 'due_date',
      'sales_rep', 'overall_discount_pct', 'vat_pct', 'notes', 'payment_terms_days',
      'total_excl', 'total_vat', 'total_discount', 'sub_total', 'grand_total', 'amount',
    ]
    for (const f of allowedFields) {
      if (body[f] !== undefined) updates[f] = body[f]
    }

    if (body.line_items !== undefined) {
      const { data: orgRecord } = await supabase
        .from('organisations')
        .select('default_vat_rate')
        .eq('id', orgId)
        .single()

      const vatRate = Number(body.vat_pct ?? orgRecord?.default_vat_rate ?? 15)
      const discPct = Number(body.overall_discount_pct ?? 0)
      const items = Array.isArray(body.line_items) ? body.line_items : []

      let totalExcl = 0
      let totalVat = 0

      await supabase.from('invoice_line_items').delete().eq('invoice_id', id).eq('org_id', orgId)

      if (items.length > 0) {
        const lineRows = items.map((item: any, idx: number) => {
          const qty = Number(item.quantity) || 1
          const price = Number(item.excl_price) || 0
          const itemDisc = Number(item.disc_pct) || 0
          const itemVat = Number(item.vat_pct) ?? vatRate
          const lineExcl = qty * price * (1 - itemDisc / 100)
          const lineVatAmt = lineExcl * (itemVat / 100)
          const lineIncl = lineExcl + lineVatAmt
          totalExcl += lineExcl
          totalVat += lineVatAmt

          return {
            org_id: orgId,
            invoice_id: id,
            description: item.description || 'Assessment',
            detail_lines: item.detail_lines || [],
            quantity: qty,
            excl_price: price,
            disc_pct: itemDisc,
            vat_pct: itemVat,
            excl_total: lineExcl,
            incl_total: lineIncl,
            order_index: idx,
          }
        })

        const { error: liErr } = await supabase.from('invoice_line_items').insert(lineRows)
        if (liErr) throw liErr
      }

      const totalDiscount = totalExcl * (discPct / 100)
      const subTotal = totalExcl - totalDiscount + totalVat
      updates.total_excl = totalExcl
      updates.total_vat = totalVat
      updates.total_discount = totalDiscount
      updates.sub_total = subTotal
      updates.grand_total = subTotal
      updates.amount = subTotal
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*, case:cases(id, case_number, client_name, claim_reference, vehicle_registration, vehicle_manufacturer, vehicle_model, assessment_type), client:clients(id, name, vat_number, postal_address, physical_address)')
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params
    await supabase.from('invoice_line_items').delete().eq('invoice_id', id).eq('org_id', orgId)
    const { error } = await supabase.from('invoices').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
