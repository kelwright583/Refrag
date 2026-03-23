import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const trackEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  event_props: z.record(z.unknown()).optional(),
  vertical: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await request.json()
    const parseResult = trackEventSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 })
    }
    const { event_name, event_props, vertical } = parseResult.data

    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    await supabase.from('platform_events').insert({
      org_id: orgMember?.org_id ?? null,
      user_id: user.id,
      event_name,
      event_props: event_props ?? {},
      vertical: vertical ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
