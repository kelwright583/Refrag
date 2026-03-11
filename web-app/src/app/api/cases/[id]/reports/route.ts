/**
 * Reports API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateReportInput, UpdateReportInput } from '@/lib/types/report'

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
 * GET /api/cases/[id]/reports - Get all reports for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('version', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/cases/[id]/reports - Create a new report
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
    const body: CreateReportInput = await request.json()

    // Get the latest version for this case
    const { data: latestReport, error: latestError } = await supabase
      .from('reports')
      .select('version')
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = latestReport ? latestReport.version + 1 : 1

    // Create the report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        org_id: orgId,
        case_id: params.id,
        created_by: user.id,
        version: nextVersion,
        title: body.title,
        summary: body.summary || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    // Create default sections
    const defaultSections = [
      { section_key: 'OVERVIEW', heading: 'Overview', order_index: 0 },
      { section_key: 'FINDINGS', heading: 'Findings', order_index: 1 },
      { section_key: 'DAMAGE', heading: 'Damage Assessment', order_index: 2 },
      { section_key: 'ESTIMATE', heading: 'Estimate', order_index: 3 },
      { section_key: 'RECOMMENDATION', heading: 'Recommendation', order_index: 4 },
    ]

    const sectionsToInsert = defaultSections.map((section) => ({
      org_id: orgId,
      report_id: report.id,
      section_key: section.section_key,
      heading: section.heading,
      body_md: '',
      order_index: section.order_index,
    }))

    const { error: sectionsError } = await supabase
      .from('report_sections')
      .insert(sectionsToInsert)

    if (sectionsError) throw sectionsError

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: params.id,
      action: 'REPORT_CREATED',
      details: {
        report_id: report.id,
        version: nextVersion,
        title: body.title,
      },
    })

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
