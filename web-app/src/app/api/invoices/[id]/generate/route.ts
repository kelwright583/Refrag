/**
 * POST: Generate professional tax invoice PDF matching the assessment industry standard layout.
 * Includes: company logo, FROM/TO sections, line items table, banking details, totals.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'

async function getUserOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No organisation')
  return orgMember.org_id
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(n: number): string {
  return `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const { id } = await params

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('*, case:cases(id, case_number, client_name, claim_reference, vehicle_registration, vehicle_manufacturer, vehicle_model, assessment_type), client:clients(id, name, vat_number, postal_address, physical_address, contact_email)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()
    if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .eq('org_id', orgId)
      .order('order_index')

    const { data: org } = await supabase
      .from('organisations')
      .select('name, legal_name, registration_number, vat_number, postal_address, physical_address, phone, email, logo_storage_path, banking_details')
      .eq('id', orgId)
      .single()

    let logoBuffer: Buffer | null = null
    if (org?.logo_storage_path) {
      try {
        const { data: logoData } = await supabase.storage.from('evidence').download(org.logo_storage_path)
        if (logoData) {
          const arrayBuffer = await logoData.arrayBuffer()
          logoBuffer = Buffer.from(arrayBuffer)
        }
      } catch {
        // Logo not available - continue without it
      }
    }

    const items = lineItems || []
    const caseData = inv.case as any
    const clientData = inv.client as any
    const banking = (org?.banking_details && typeof org.banking_details === 'object')
      ? org.banking_details as Record<string, string>
      : {}

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width - 80
      const leftCol = 40
      const rightCol = doc.page.width / 2 + 20
      const colWidth = pageWidth / 2 - 10

      // ============================================================
      // HEADER: Logo + TAX INVOICE title + invoice meta
      // ============================================================
      const headerTop = 40
      let logoHeight = 60

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, leftCol, headerTop, { height: logoHeight, fit: [160, logoHeight] })
        } catch {
          logoHeight = 0
        }
      }

      doc.fontSize(18).font('Helvetica-Bold')
        .text('TAX INVOICE', rightCol, headerTop, { width: colWidth, align: 'right' })

      const metaTop = headerTop + 22
      const metaLabelX = rightCol
      const metaValueX = rightCol + colWidth - 120

      doc.fontSize(8).font('Helvetica')
      const metaFields = [
        ['NUMBER:', inv.invoice_number],
        ['REFERENCE:', inv.reference || ''],
        ['DATE:', formatDate(inv.date)],
        ['DUE DATE:', formatDate(inv.due_date)],
        ['SALES REP:', inv.sales_rep || ''],
        ['OVERALL DISCOUNT %:', `${Number(inv.overall_discount_pct || 0).toFixed(2)}%`],
        ['PAGE:', '1/1'],
      ]

      let metaY = metaTop
      for (const [label, value] of metaFields) {
        doc.font('Helvetica-Bold').text(label, metaLabelX, metaY, { width: 120 })
        doc.font('Helvetica').text(value as string, metaValueX, metaY, { width: 120, align: 'right' })
        metaY += 12
      }

      // ============================================================
      // FROM section
      // ============================================================
      let sectionY = Math.max(headerTop + logoHeight + 20, metaY + 15)

      doc.moveTo(leftCol, sectionY).lineTo(leftCol + pageWidth, sectionY).lineWidth(0.5).stroke('#999')
      sectionY += 10

      doc.fontSize(7).font('Helvetica').fillColor('#666').text('FROM', leftCol, sectionY)
      doc.fillColor('#666').text('TO', rightCol, sectionY)
      sectionY += 12

      const orgName = org?.legal_name || org?.name || 'Organisation'
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
        .text(orgName, leftCol, sectionY, { width: colWidth })

      const clientName = clientData?.name || caseData?.client_name || 'Client'
      doc.fontSize(11).font('Helvetica-Bold')
        .text(clientName, rightCol, sectionY, { width: colWidth })

      sectionY += 16

      doc.fontSize(8).font('Helvetica').fillColor('#000')
      if (org?.vat_number) {
        doc.font('Helvetica-Bold').text('VAT NO:', leftCol, sectionY, { continued: true }).font('Helvetica').text(`  ${org.vat_number}`)
        sectionY += 11
      }
      if (clientData?.vat_number) {
        doc.font('Helvetica-Bold').text('CUSTOMER VAT NO:', rightCol, sectionY - 11, { continued: true }).font('Helvetica').text(`  ${clientData.vat_number}`)
      }

      const addressStartY = sectionY + 2

      if (org?.postal_address || org?.physical_address) {
        let aY = addressStartY
        if (org.postal_address) {
          doc.font('Helvetica-Bold').text('POSTAL ADDRESS:', leftCol, aY)
          aY += 10
          for (const line of org.postal_address.split('\n')) {
            doc.font('Helvetica').text(line.trim(), leftCol, aY)
            aY += 10
          }
          aY += 4
        }
        if (org.physical_address) {
          doc.font('Helvetica-Bold').text('PHYSICAL ADDRESS:', leftCol + colWidth / 2, addressStartY)
          let pY = addressStartY + 10
          for (const line of org.physical_address.split('\n')) {
            doc.font('Helvetica').text(line.trim(), leftCol + colWidth / 2, pY)
            pY += 10
          }
        }
        sectionY = aY + 4
      }

      if (clientData?.postal_address || clientData?.physical_address) {
        let cY = addressStartY
        if (clientData.postal_address) {
          doc.font('Helvetica-Bold').text('POSTAL ADDRESS:', rightCol, cY)
          cY += 10
          for (const line of (clientData.postal_address as string).split('\n')) {
            doc.font('Helvetica').text(line.trim(), rightCol, cY)
            cY += 10
          }
        }
        if (clientData.physical_address) {
          doc.font('Helvetica-Bold').text('PHYSICAL ADDRESS:', rightCol + colWidth / 2, addressStartY)
          let pY = addressStartY + 10
          for (const line of (clientData.physical_address as string).split('\n')) {
            doc.font('Helvetica').text(line.trim(), rightCol + colWidth / 2, pY)
            pY += 10
          }
        }
      }

      sectionY = Math.max(sectionY, addressStartY + 50) + 10

      // ============================================================
      // LINE ITEMS TABLE
      // ============================================================
      doc.moveTo(leftCol, sectionY).lineTo(leftCol + pageWidth, sectionY).lineWidth(0.5).stroke('#999')
      sectionY += 2

      // Table header
      const tableHeaderY = sectionY
      const cols = {
        desc: { x: leftCol, w: 160 },
        qty: { x: leftCol + 165, w: 50 },
        price: { x: leftCol + 220, w: 65 },
        disc: { x: leftCol + 290, w: 45 },
        vat: { x: leftCol + 340, w: 45 },
        exclTotal: { x: leftCol + 390, w: 65 },
        inclTotal: { x: leftCol + 460, w: 55 },
      }

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#666')
      doc.text('Description', cols.desc.x, tableHeaderY, { width: cols.desc.w })
      doc.text('Quantity', cols.qty.x, tableHeaderY, { width: cols.qty.w, align: 'right' })
      doc.text('Excl. Price', cols.price.x, tableHeaderY, { width: cols.price.w, align: 'right' })
      doc.text('Disc %', cols.disc.x, tableHeaderY, { width: cols.disc.w, align: 'right' })
      doc.text('VAT %', cols.vat.x, tableHeaderY, { width: cols.vat.w, align: 'right' })
      doc.text('Excl. Total', cols.exclTotal.x, tableHeaderY, { width: cols.exclTotal.w, align: 'right' })
      doc.text('Incl. Total', cols.inclTotal.x, tableHeaderY, { width: cols.inclTotal.w, align: 'right' })
      doc.fillColor('#000')

      sectionY = tableHeaderY + 12
      doc.moveTo(leftCol, sectionY).lineTo(leftCol + pageWidth, sectionY).lineWidth(0.3).stroke('#ccc')
      sectionY += 6

      // Table rows
      for (const item of items) {
        doc.fontSize(8).font('Helvetica-Bold')
        doc.text(item.description || '', cols.desc.x, sectionY, { width: cols.desc.w })

        doc.font('Helvetica')
        doc.text(Number(item.quantity).toFixed(2), cols.qty.x, sectionY, { width: cols.qty.w, align: 'right' })
        doc.text(formatCurrency(item.excl_price), cols.price.x, sectionY, { width: cols.price.w, align: 'right' })
        doc.text(`${Number(item.disc_pct).toFixed(2)}%`, cols.disc.x, sectionY, { width: cols.disc.w, align: 'right' })
        doc.text(`${Number(item.vat_pct).toFixed(2)}%`, cols.vat.x, sectionY, { width: cols.vat.w, align: 'right' })
        doc.text(formatCurrency(item.excl_total), cols.exclTotal.x, sectionY, { width: cols.exclTotal.w, align: 'right' })
        doc.font('Helvetica-Bold')
        doc.text(formatCurrency(item.incl_total), cols.inclTotal.x, sectionY, { width: cols.inclTotal.w, align: 'right' })
        doc.font('Helvetica')

        sectionY += 14

        // Detail lines (italics, smaller)
        const detailLines = (item.detail_lines || []).filter(Boolean)
        if (detailLines.length > 0) {
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#444')
          for (const dl of detailLines) {
            doc.text(dl, cols.desc.x + 8, sectionY, { width: cols.desc.w + 100 })
            sectionY += 10
          }
          doc.fillColor('#000')
          sectionY += 4
        }

        // Case details for first item
        if (items.indexOf(item) === 0 && caseData) {
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#444')
          if (caseData.claim_reference) {
            doc.text(`Claim number: ${caseData.claim_reference}`, cols.desc.x + 8, sectionY)
            sectionY += 10
          }
          if (caseData.vehicle_registration) {
            doc.text(`Vehicle registration no.: ${caseData.vehicle_registration}`, cols.desc.x + 8, sectionY)
            sectionY += 10
          }
          if (caseData.vehicle_manufacturer) {
            doc.text(`Manufacturer: ${caseData.vehicle_manufacturer}`, cols.desc.x + 8, sectionY)
            sectionY += 10
          }
          if (caseData.vehicle_model) {
            doc.text(`Model: ${caseData.vehicle_model}`, cols.desc.x + 8, sectionY)
            sectionY += 10
          }
          if (clientName) {
            doc.text(`Client: ${clientName}`, cols.desc.x + 8, sectionY)
            sectionY += 10
          }
          doc.fillColor('#000')
          sectionY += 6
        }
      }

      sectionY += 10
      doc.moveTo(leftCol, sectionY).lineTo(leftCol + pageWidth, sectionY).lineWidth(0.5).stroke('#999')
      sectionY += 20

      // ============================================================
      // BANKING DETAILS + TOTALS
      // ============================================================
      const bankX = leftCol
      const totalsX = rightCol + 40

      if (banking && (banking.account_holder || banking.bank)) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#C72A00')
        doc.text('Account Holder:', bankX, sectionY)
        doc.text(banking.account_holder || '', bankX, sectionY + 11)

        doc.text('Bank:', bankX, sectionY + 24)
        doc.text(banking.bank || '', bankX, sectionY + 35)

        doc.text('Account number:', bankX, sectionY + 48)
        doc.text(banking.account_number || '', bankX, sectionY + 59)

        doc.text('Branch:', bankX, sectionY + 72)
        const branchText = banking.branch_name
          ? (banking.branch_code ? `${banking.branch_name} (${banking.branch_code})` : banking.branch_name)
          : banking.branch_code || ''
        doc.text(branchText, bankX, sectionY + 83)
        doc.fillColor('#000')
      }

      // Totals
      const totalDiscount = Number(inv.total_discount || 0)
      const totalExcl = Number(inv.total_excl || 0)
      const totalVat = Number(inv.total_vat || 0)
      const subTotal = Number(inv.sub_total || 0)
      const grandTotal = Number(inv.grand_total || inv.amount || 0)

      doc.fontSize(8).font('Helvetica-Bold')
      let tY = sectionY

      const totalsLabelX = totalsX
      const totalsValueX = totalsX + 120

      doc.text('Total Discount:', totalsLabelX, tY, { width: 100, align: 'right' })
      doc.text(formatCurrency(totalDiscount), totalsValueX, tY, { width: 80, align: 'right' })
      tY += 14

      doc.text('Total Exclusive:', totalsLabelX, tY, { width: 100, align: 'right' })
      doc.text(formatCurrency(totalExcl), totalsValueX, tY, { width: 80, align: 'right' })
      tY += 14

      doc.text('Total VAT:', totalsLabelX, tY, { width: 100, align: 'right' })
      doc.text(formatCurrency(totalVat), totalsValueX, tY, { width: 80, align: 'right' })
      tY += 14

      doc.text('Sub Total:', totalsLabelX, tY, { width: 100, align: 'right' })
      doc.text(formatCurrency(subTotal), totalsValueX, tY, { width: 80, align: 'right' })
      tY += 18

      doc.moveTo(totalsLabelX, tY).lineTo(totalsValueX + 80, tY).lineWidth(0.5).stroke('#999')
      tY += 8

      doc.text('Grand Total:', totalsLabelX, tY, { width: 100, align: 'right' })
      doc.text(formatCurrency(grandTotal), totalsValueX, tY, { width: 80, align: 'right' })
      tY += 20

      // Balance Due
      doc.fontSize(8).font('Helvetica-Bold')
        .text('BALANCE DUE', totalsLabelX, tY, { width: 100, align: 'right' })

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#C72A00')
        .text(formatCurrency(grandTotal), totalsValueX, tY - 2, { width: 80, align: 'right' })
      doc.fillColor('#000')

      // Footer
      doc.fontSize(7).font('Helvetica').fillColor('#999')
        .text(`Generated ${new Date().toLocaleDateString('en-ZA')}`, leftCol, doc.page.height - 40, {
          width: pageWidth, align: 'center',
        })

      doc.end()
    })

    const storagePath = `invoices/${orgId}/${id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw uploadError

    const { data: updated, error: updateErr } = await supabase
      .from('invoices')
      .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()
    if (updateErr) throw updateErr
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
