/**
 * Report sections API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  CreateReportSectionInput,
  UpdateReportSectionInput,
  ReorderSectionsInput,
} from '@/lib/types/report'
import { z } from 'zod'

const createSectionSchema = z.object({
  section_key: z.string().min(1),
  heading: z.string().min(1),
  body_md: z.string(),
  order_index: z.number().int().min(0),
})
const upsertSectionsSchema = z.object({
  sections: z.array(z.object({
    id: z.string().uuid().optional(),
    section_key: z.string().min(1),
    heading: z.string().min(1),
    body_md: z.string(),
    order_index: z.number().int().min(0),
  })),
})

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
 * POST /api/reports/[reportId]/sections - Create a new section
 */
export async function POST(
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
    const raw = await request.json()
    const parseResult = createSectionSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const body = parseResult.data

    // Verify report belongs to org
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id')
      .eq('id', params.reportId)
      .eq('org_id', orgId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { data: section, error } = await supabase
      .from('report_sections')
      .insert({
        org_id: orgId,
        report_id: params.reportId,
        section_key: body.section_key,
        heading: body.heading,
        body_md: body.body_md || '',
        order_index: body.order_index ?? 0,
      })
      .select()
      .single()

    if (error) throw error

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.id,
      action: 'REPORT_SECTION_CREATED',
      details: {
        report_id: params.reportId,
        section_id: section.id,
        section_key: body.section_key,
      },
    })

    return NextResponse.json(section)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/reports/[reportId]/sections/reorder - Reorder sections
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
    const raw = await request.json()
    const patchParseResult = upsertSectionsSchema.safeParse(raw)
    if (!patchParseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: patchParseResult.error.flatten() }, { status: 400 })
    }
    const body: ReorderSectionsInput = raw as ReorderSectionsInput

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

    // Update each section's order_index
    for (const { id, order_index } of body.section_orders) {
      const { error } = await supabase
        .from('report_sections')
        .update({ order_index })
        .eq('id', id)
        .eq('report_id', params.reportId)
        .eq('org_id', orgId)

      if (error) throw error
    }

    // Log audit event
    await supabase.from('audit_log').insert({
      org_id: orgId,
      actor_user_id: user.id,
      case_id: report.case_id,
      action: 'REPORT_SECTIONS_REORDERED',
      details: {
        report_id: params.reportId,
        section_orders: body.section_orders,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
