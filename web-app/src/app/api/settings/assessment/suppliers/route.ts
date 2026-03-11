import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createPreferredSupplierSchema } from '@/lib/validation/assessment'

/** GET /api/settings/assessment/suppliers */
export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbError } = await supabase
      .from('preferred_parts_suppliers')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name')

    if (dbError) throw dbError
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return serverError(err.message)
  }
}

/** POST /api/settings/assessment/suppliers */
export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = createPreferredSupplierSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('preferred_parts_suppliers')
      .insert({ ...parsed.data, org_id: orgId })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
