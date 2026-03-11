import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { createPreExistingDamageSchema } from '@/lib/validation/assessment'

type Params = { params: Promise<{ assessmentId: string }> }

/** POST /api/assessments/[assessmentId]/damages */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { assessmentId } = await params
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error || !user) return error

    const body = await request.json()
    const parsed = createPreExistingDamageSchema.safeParse(body)
    if (!parsed.success) return serverError(parsed.error.errors[0].message, 400)

    const { data, error: dbError } = await supabase
      .from('pre_existing_damages')
      .insert({ ...parsed.data, assessment_id: assessmentId, org_id: orgId })
      .select()
      .single()

    if (dbError) throw dbError
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return serverError(err.message)
  }
}
