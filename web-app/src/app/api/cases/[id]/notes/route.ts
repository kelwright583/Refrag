/**
 * Case notes API route — typed JSON blobs per note_type
 * GET  /api/cases/[id]/notes?type=<note_type>
 * POST /api/cases/[id]/notes  { note_type, content }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createNoteSchema = z.object({
  note_type: z.string().min(1, 'note_type is required'),
  content: z.unknown().optional(),
})

async function getUserOrgId(supabase: any): Promise<{ userId: string; orgId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (error || !orgMember) throw new Error('No organization found for user')

  return { userId: user.id, orgId: orgMember.org_id }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { orgId } = await getUserOrgId(supabase)

    const { searchParams } = new URL(request.url)
    const noteType = searchParams.get('type')

    let query = supabase
      .from('case_notes')
      .select('*')
      .eq('case_id', params.id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (noteType) {
      query = query.eq('note_type', noteType)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { userId, orgId } = await getUserOrgId(supabase)

    const rawBody = await request.json()
    const parsed = createNoteSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { note_type, content } = parsed.data

    // Upsert: one record per case + note_type
    const { data, error } = await supabase
      .from('case_notes')
      .upsert(
        {
          case_id: params.id,
          org_id: orgId,
          created_by: userId,
          note_type,
          content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'case_id,note_type',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
