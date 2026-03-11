import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'

type Params = { params: Promise<{ supplierId: string }> }

/** DELETE /api/settings/assessment/suppliers/[supplierId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { supplierId } = await params
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { error: dbError } = await supabase
      .from('preferred_parts_suppliers')
      .update({ is_active: false })
      .eq('id', supplierId)
      .eq('org_id', orgId)

    if (dbError) throw dbError
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
