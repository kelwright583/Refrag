import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createApprovedRepairerSchema } from '@/lib/validation/assessment'

/** GET /api/settings/assessment/repairers */
export async function GET() {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const { data, error: dbError } = await supabase
      .from('approved_repairers')
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

/** POST /api/settings/assessment/repairers */
export async function POST(request: NextRequest) {
  try {
    const { supabase, orgId, error } = await getAuthContext()
    if (error) return error

    const body = await request.json()
    const parsed = createApprovedRepairerSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('approved_repairers')
      .insert({ ...parsed.data, org_id: orgId })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
