import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitResponse } from '@/lib/api/server-utils'
import { getOpenAIClient } from '@/lib/ai/openai'
import { sanitiseForAI, summariseInput } from '@/lib/ai/sanitiser'
import { VERTICAL_CONFIGS, type VerticalId } from '@/lib/verticals/config'

async function getAuth(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (error || !orgMember) throw new Error('No org')
  return { orgId: orgMember.org_id, userId: user.id }
}

const DRAFT_SECTION_SYSTEM = `You are an expert insurance report writer. You draft professional report sections for insurance assessors, loss adjusters, and investigators.

Rules:
- Write in formal, professional English appropriate for an insurance report
- Use third person, passive voice where appropriate
- Be factual and precise — do not embellish or speculate
- Reference data provided in the context but do not invent data
- Output clean Markdown (headings, bullet lists, tables where appropriate)
- NEVER include personal information — all PII has been redacted
- Keep the section focused on its topic
- Use the section heading and description to guide scope`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const limit = rateLimitResponse(request)
  if (limit) return limit

  try {
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)
    const body = await request.json()

    const { case_id, section_key, vertical, context_data } = body

    if (!section_key || !vertical) {
      return NextResponse.json(
        { error: 'section_key and vertical are required' },
        { status: 400 },
      )
    }

    const config = VERTICAL_CONFIGS[vertical as VerticalId] ?? VERTICAL_CONFIGS.general
    const sectionTemplate = config.reportSections.find((s) => s.key === section_key)

    if (!sectionTemplate) {
      return NextResponse.json({ error: 'Unknown section_key' }, { status: 400 })
    }

    if (!sectionTemplate.aiDraftAvailable) {
      return NextResponse.json(
        { error: 'AI drafting is not available for this section' },
        { status: 400 },
      )
    }

    const sanitisedContext = context_data
      ? sanitiseForAI(JSON.stringify(context_data, null, 2))
      : 'No additional context provided.'

    const userPrompt = `Draft the "${sectionTemplate.heading}" section for a ${config.label} report.

Section description: ${sectionTemplate.description}

Context data (PII redacted):
${sanitisedContext}

Write this section in Markdown. Keep it concise but thorough.`

    // Graceful fallback when OpenAI is not configured
    if (!process.env.OPENAI_API_KEY) {
      const stubContent = `## ${sectionTemplate.heading}\n\n*AI drafting is not available — OPENAI_API_KEY is not configured.*\n\nPlease write this section manually.`
      return NextResponse.json({ content: stubContent, section_key, stub: true })
    }

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: DRAFT_SECTION_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    })

    const durationMs = Date.now() - startTime
    const content = response.choices[0]?.message?.content || ''

    await supabase.from('ai_processing_log').insert({
      org_id: orgId,
      case_id: case_id || null,
      evidence_id: null,
      actor_user_id: userId,
      operation: 'draft_section',
      input_summary: summariseInput('draft_section', {
        text_length: sanitisedContext.length,
        field: section_key,
      }),
      output_summary: `section=${section_key}, chars=${content.length}`,
      model: 'gpt-4o',
      tokens_used: response.usage?.total_tokens || 0,
      duration_ms: durationMs,
    })

    return NextResponse.json({ content, section_key })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
