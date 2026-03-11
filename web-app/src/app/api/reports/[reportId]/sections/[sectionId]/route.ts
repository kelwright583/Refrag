/**
 * Report section API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateReportSectionInput } from '@/lib/types/report'

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
 * PATCH /api/reports/[reportId]/sections/[sectionId] - Update section
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { reportId: string; sectionId: string } }
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
    const updates: UpdateReportSectionInput = await request.json()

    // Verify report belongs to org
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, case_id')
      .eq('id', params.reportId)
      .eq('org_id', orgId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (updates.heading !== undefined) updateData.heading = updates.heading
    if (updates.body_md !== undefined) updateData.body_md = updates.body_md
    if (updates.order_index !== undefined) updateData.order_index = updates.order_index

    const { data: section, error } = await supabase
      .from('report_sections')
      .update(updateData)
      .eq('id', params.sectionId)
      .eq('report_id', params.reportId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.case_id,
      action: 'REPORT_SECTION_UPDATED',
      details: {
        report_id: params.reportId,
        section_id: params.sectionId,
        ...updateData,
      },
    })

    return NextResponse.json(section)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/reports/[reportId]/sections/[sectionId] - Delete section
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reportId: string; sectionId: string } }
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

    // Verify report belongs to org
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, case_id')
      .eq('id', params.reportId)
      .eq('org_id', orgId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('report_sections')
      .delete()
      .eq('id', params.sectionId)
      .eq('report_id', params.reportId)
      .eq('org_id', orgId)

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.case_id,
      action: 'REPORT_SECTION_DELETED',
      details: {
        report_id: params.reportId,
        section_id: params.sectionId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
