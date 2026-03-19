import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackServerEvent } from '@/lib/events'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return { orgId: orgMember.org_id, userId: user.id }
}

function generateInvoiceNumber(prefix?: string): string {
  const now = new Date()
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `${prefix || 'INV'}${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${seq}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { orgId } = await getUserOrgId(supabase)
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id')

    let q = supabase
      .from('invoices')
      .select('*, case:cases(id, case_number, client_name, claim_reference, vehicle_registration, vehicle_manufacturer, vehicle_model, assessment_type), client:clients(id, name, vat_number, postal_address, physical_address)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (caseId) q = q.eq('case_id', caseId)
    const { data, error } = await q.limit(200)
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { orgId, userId } = await getUserOrgId(supabase)
    const body = await request.json()

    const {
      case_id, client_id: clientIdParam, line_items,
      reference, date, due_date, sales_rep, overall_discount_pct,
      vat_pct, notes, payment_terms_days,
    } = body

    let clientId = clientIdParam
    if (!clientId && case_id) {
      const { data: caseRow } = await supabase
        .from('cases')
        .select('client_id')
        .eq('id', case_id)
        .eq('org_id', orgId)
        .single()
      clientId = caseRow?.client_id
    }
    if (!clientId) return NextResponse.json({ error: 'Client required' }, { status: 400 })

    const { data: orgRecord } = await supabase
      .from('organisations')
      .select('currency_code, default_vat_rate')
      .eq('id', orgId)
      .single()

    const orgCurrency = orgRecord?.currency_code || 'USD'
    const orgVatRate = orgRecord?.default_vat_rate ?? 15
    const vatRate = vat_pct != null ? Number(vat_pct) : orgVatRate
    const discPct = overall_discount_pct != null ? Number(overall_discount_pct) : 0

    let totalExcl = 0
    let totalVat = 0
    let totalDiscount = 0

    const items = Array.isArray(line_items) ? line_items : []
    for (const item of items) {
      const qty = Number(item.quantity) || 1
      const price = Number(item.excl_price) || 0
      const itemDisc = Number(item.disc_pct) || 0
      const itemVat = Number(item.vat_pct) ?? vatRate

      const lineExcl = qty * price * (1 - itemDisc / 100)
      const lineVat = lineExcl * (itemVat / 100)
      totalExcl += lineExcl
      totalVat += lineVat
    }

    totalDiscount = totalExcl * (discPct / 100)
    const subTotal = totalExcl - totalDiscount + totalVat
    const grandTotal = subTotal

    const invoiceNumber = generateInvoiceNumber()
    const dueDate = due_date || (() => {
      const d = new Date()
      d.setDate(d.getDate() + (payment_terms_days || 30))
      return d.toISOString().split('T')[0]
    })()

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        case_id: case_id || null,
        client_id: clientId,
        invoice_number: invoiceNumber,
        amount: grandTotal,
        currency: orgCurrency,
        status: 'draft',
        reference: reference || null,
        date: date || new Date().toISOString().split('T')[0],
        due_date: dueDate,
        sales_rep: sales_rep || null,
        overall_discount_pct: discPct,
        vat_pct: vatRate,
        total_excl: totalExcl,
        total_vat: totalVat,
        total_discount: totalDiscount,
        sub_total: subTotal,
        grand_total: grandTotal,
        notes: notes || null,
        payment_terms_days: payment_terms_days || 30,
        created_by: userId,
      })
      .select('*')
      .single()
    if (invErr) throw invErr

    if (items.length > 0) {
      const lineRows = items.map((item: any, idx: number) => {
        const qty = Number(item.quantity) || 1
        const price = Number(item.excl_price) || 0
        const itemDisc = Number(item.disc_pct) || 0
        const itemVat = Number(item.vat_pct) ?? vatRate
        const lineExcl = qty * price * (1 - itemDisc / 100)
        const lineIncl = lineExcl * (1 + itemVat / 100)

        return {
          org_id: orgId,
          invoice_id: invoice.id,
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

    const { data: full } = await supabase
      .from('invoices')
      .select('*, case:cases(id, case_number, client_name, claim_reference, vehicle_registration, vehicle_manufacturer, vehicle_model, assessment_type), client:clients(id, name, vat_number, postal_address, physical_address)')
      .eq('id', invoice.id)
      .single()

    trackServerEvent('invoice_created', {
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      case_id: case_id || null,
      grand_total: grandTotal,
      currency: orgCurrency,
      line_item_count: items.length,
    }, { orgId, userId })

    return NextResponse.json(full || invoice)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
