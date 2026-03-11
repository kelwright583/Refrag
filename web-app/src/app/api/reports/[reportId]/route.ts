/**
 * Report API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateReportInput } from '@/lib/types/report'

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
 * GET /api/reports/[reportId] - Get report with sections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    // Get report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', params.reportId)
      .eq('org_id', orgId)
      .single()

    if (reportError) throw reportError
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get sections
    const { data: sections, error: sectionsError } = await supabase
      .from('report_sections')
      .select('*')
      .eq('report_id', params.reportId)
      .eq('org_id', orgId)
      .order('order_index', { ascending: true })

    if (sectionsError) throw sectionsError

    return NextResponse.json({
      ...report,
      sections: sections || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/reports/[reportId] - Update report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { reportId: string } }
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
    const updates: UpdateReportInput = await request.json()

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.summary !== undefined) updateData.summary = updates.summary
    if (updates.status !== undefined) updateData.status = updates.status

    const { data: report, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', params.reportId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.case_id,
      action: 'REPORT_UPDATED',
      details: {
        report_id: params.reportId,
        ...updateData,
      },
    })

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
