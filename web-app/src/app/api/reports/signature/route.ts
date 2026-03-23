/**
 * POST /api/reports/signature
 * Uploads an assessor signature image to Supabase Storage.
 * Returns a short-lived signed URL for display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
  report_id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!orgMember) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const reportId = formData.get('report_id') as string | null

    const validation = querySchema.safeParse({ report_id: reportId })
    if (!validation.success || !file) {
      return NextResponse.json({ error: 'file and report_id are required' }, { status: 400 })
    }

    const storagePath = `org/${orgMember.org_id}/signatures/${validation.data.report_id}.png`

    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(storagePath, file, { contentType: 'image/png', upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = await supabase.storage
      .from('evidence')
      .createSignedUrl(storagePath, 3600) // 1 hour

    return NextResponse.json({ signedUrl: urlData?.signedUrl ?? null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
