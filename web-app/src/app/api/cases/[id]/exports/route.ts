/**
 * Exports API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateExportInput } from '@/lib/types/export'

async function getUserOrgId(supabase: any): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) {
    throw new Error('No organization found for user')
  }

  return orgMember.org_id
}

/**
 * GET /api/cases/[caseId]/exports - Get all exports for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('exports')
      .select(`
        *,
        case:cases(case_number, client_name),
        report:reports(title, version)
      `)
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data
    const result = (data || []).map((item: any) => ({
      ...item,
      case: item.case ? { case_number: item.case.case_number, client_name: item.case.client_name } : undefined,
      report: item.report ? { title: item.report.title, version: item.report.version } : undefined,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/exports - Create a new export
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase)
    const body: CreateExportInput = await request.json()

    // Create export record (PDF will be generated in a separate endpoint)
    const { data, error } = await supabase
      .from('exports')
      .insert({
        org_id: orgId,
        case_id: params.id,
        report_id: body.report_id || null,
        assessment_id: body.assessment_id || null,
        export_type: body.export_type || 'assessor_pack',
        meta: {},
      })
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'EXPORT_CREATED',
      details: {
        export_id: data.id,
        export_type: body.export_type || 'assessor_pack',
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
