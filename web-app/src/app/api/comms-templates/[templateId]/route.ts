/**
 * Communications template API route handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateCommsTemplateInput } from '@/lib/types/comms'
import { z } from 'zod'

const bodySchema = z.object({}).passthrough()

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
 * GET /api/comms-templates/[templateId] - Get template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { data, error } = await supabase
      .from('comms_templates')
      .select('*')
      .eq('id', params.templateId)
      .eq('org_id', orgId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/comms-templates/[templateId] - Update template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } }
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
    const parseResult = bodySchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const updates = parseResult.data as UpdateCommsTemplateInput

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.subject_template !== undefined)
      updateData.subject_template = updates.subject_template
    if (updates.body_template_md !== undefined)
      updateData.body_template_md = updates.body_template_md

    const { data, error } = await supabase
      .from('comms_templates')
      .update(updateData)
      .eq('id', params.templateId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/comms-templates/[templateId] - Delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
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

    const { error } = await supabase
      .from('comms_templates')
      .delete()
      .eq('id', params.templateId)
      .eq('org_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
