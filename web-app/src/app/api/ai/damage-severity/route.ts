/**
 * AI: Damage severity assessment — assesses damage from an image
 * Uses OpenAI Vision API with data-protection ring-fencing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/ai/openai'
import { DAMAGE_SEVERITY_SYSTEM, DAMAGE_SEVERITY_USER } from '@/lib/ai/prompts'
import { summariseInput } from '@/lib/ai/sanitiser'

async function getAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No org')
  return { orgId: orgMember.org_id, userId: user.id }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const body = await request.json()

    const { evidence_id, case_id, image_url } = body

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: DAMAGE_SEVERITY_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: DAMAGE_SEVERITY_USER },
            { type: 'image_url', image_url: { url: image_url, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.1,
    })

    const durationMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || '{}'

    let result
    try {
      result = JSON.parse(content)
    } catch {
      result = {
        severity: 'unknown',
        affected_area: 'Unable to assess',
        estimated_repair_type: 'unknown',
        notes: content,
        flags: [],
      }
    }

    // Log to ai_processing_log
    await supabase.from('ai_processing_log').insert({
      org_id: orgId,
      case_id: case_id || null,
      evidence_id: evidence_id || null,
      actor_user_id: userId,
      operation: 'damage_severity',
      input_summary: summariseInput('damage_severity', { image_count: 1 }),
      output_summary: `severity=${result.severity}, type=${result.estimated_repair_type}`,
      model: 'gpt-4o',
      tokens_used: response.usage?.total_tokens || 0,
      duration_ms: durationMs,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
