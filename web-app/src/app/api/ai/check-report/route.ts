/**
 * AI: Check report completeness — analyses report text for missing sections
 * Uses OpenAI Chat API with data-protection ring-fencing (PII sanitised before sending)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAIClient } from '@/lib/ai/openai'
import { CHECK_REPORT_SYSTEM, CHECK_REPORT_USER } from '@/lib/ai/prompts'
import { sanitiseForAI, summariseInput } from '@/lib/ai/sanitiser'

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

    const { case_id, report_text, report_type, known_pii } = body

    if (!report_text) {
      return NextResponse.json({ error: 'report_text is required' }, { status: 400 })
    }

    // Sanitise PII before sending to AI
    const sanitisedText = sanitiseForAI(report_text, known_pii || {})

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: CHECK_REPORT_SYSTEM },
        {
          role: 'user',
          content: `${CHECK_REPORT_USER(report_type || 'general')}\n\n---\n\n${sanitisedText}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    })

    const durationMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || '{}'

    let result
    try {
      result = JSON.parse(content)
    } catch {
      result = {
        completeness_score: 0,
        status: 'needs_attention',
        missing_sections: [],
        suggestions: [content],
        flags: [],
      }
    }

    // Log to ai_processing_log
    await supabase.from('ai_processing_log').insert({
      org_id: orgId,
      case_id: case_id || null,
      evidence_id: null,
      actor_user_id: userId,
      operation: 'check_report',
      input_summary: summariseInput('check_report', { text_length: sanitisedText.length }),
      output_summary: `score=${result.completeness_score}, status=${result.status}, missing=${result.missing_sections?.length || 0}`,
      model: 'gpt-4o',
      tokens_used: response.usage?.total_tokens || 0,
      duration_ms: durationMs,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
