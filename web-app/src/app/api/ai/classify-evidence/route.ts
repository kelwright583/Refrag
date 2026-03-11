/**
 * AI: Classify evidence image — identifies what the photo shows
 * Uses OpenAI Vision API with POPIA ring-fencing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/ai/openai'
import { CLASSIFY_EVIDENCE_SYSTEM, CLASSIFY_EVIDENCE_USER } from '@/lib/ai/prompts'
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
        { role: 'system', content: CLASSIFY_EVIDENCE_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: CLASSIFY_EVIDENCE_USER },
            { type: 'image_url', image_url: { url: image_url, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    })

    const durationMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || '{}'

    let result
    try {
      result = JSON.parse(content)
    } catch {
      result = { category: 'OTHER', label: 'Unable to classify', confidence: 'low', notes: content }
    }

    // Log to ai_processing_log (POPIA audit trail)
    await supabase.from('ai_processing_log').insert({
      org_id: orgId,
      case_id: case_id || null,
      evidence_id: evidence_id || null,
      actor_user_id: userId,
      operation: 'classify_evidence',
      input_summary: summariseInput('classify_evidence', { image_count: 1 }),
      output_summary: `category=${result.category}, confidence=${result.confidence}`,
      model: 'gpt-4o',
      tokens_used: response.usage?.total_tokens || 0,
      duration_ms: durationMs,
    })

    // Update evidence label if evidence_id provided
    if (evidence_id) {
      await supabase
        .from('evidence')
        .update({ label: result.label, ai_category: result.category })
        .eq('id', evidence_id)
        .eq('org_id', orgId)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
