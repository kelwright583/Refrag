/**
 * Case contact API route handler (single contact)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const contactTypeSchema = z.enum(['insured', 'broker', 'insurer', 'panelbeater', 'other'])

const updateContactSchema = z.object({
  type: contactTypeSchema.optional(),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
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
 * PATCH /api/contacts/[caseId]/[contactId] - Update a contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseId: string; contactId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)
    const rawBody = await request.json()
    const parsed = updateContactSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('case_contacts')
      .update(parsed.data)
      .eq('id', params.contactId)
      .eq('case_id', params.caseId)
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
 * DELETE /api/contacts/[caseId]/[contactId] - Delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { caseId: string; contactId: string } }
) {
  try {
    const supabase = await createClient()
    const orgId = await getUserOrgId(supabase)

    const { error } = await supabase
      .from('case_contacts')
      .delete()
      .eq('id', params.contactId)
      .eq('case_id', params.caseId)
      .eq('org_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
