import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { updateReportPackItemSchema } from '@/lib/validation/report-pack'

type Params = { params: Promise<{ packId: string; itemId: string }> }

/** PATCH /api/report-packs/[packId]/items/[itemId] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { packId, itemId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = updateReportPackItemSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('report_pack_items')
      .update(parsed.data)
      .eq('id', itemId)
      .eq('pack_id', packId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data)
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** DELETE /api/report-packs/[packId]/items/[itemId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { packId, itemId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbError } = await supabase
      .from('report_pack_items')
      .delete()
      .eq('id', itemId)
      .eq('pack_id', packId)
      .eq('org_id', orgId)

    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
