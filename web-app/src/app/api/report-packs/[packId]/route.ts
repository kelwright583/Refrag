import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { updateReportPackSchema } from '@/lib/validation/report-pack'

type Params = { params: Promise<{ packId: string }> }

/** GET /api/report-packs/[packId] */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data: pack, error: packError } = await supabase
      .from('report_packs')
      .select('*')
      .eq('id', packId)
      .eq('org_id', orgId)
      .single()

    if (packError || !pack) return serverError('Report pack not found', 404)

    const { data: items, error: itemsError } = await supabase
      .from('report_pack_items')
      .select('*')
      .eq('pack_id', packId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (itemsError) throw itemsError

    return NextResponse.json({ ...pack, items: items ?? [] })
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** PATCH /api/report-packs/[packId] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = updateReportPackSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const updates: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.status === 'sent') {
      updates.sent_at = new Date().toISOString()
    }

    const { data, error: dbError } = await supabase
      .from('report_packs')
      .update(updates)
      .eq('id', packId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** DELETE /api/report-packs/[packId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { packId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbError } = await supabase
      .from('report_packs')
      .delete()
      .eq('id', packId)
      .eq('org_id', orgId)

    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
