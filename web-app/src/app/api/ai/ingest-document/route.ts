/**
 * POST /api/ai/ingest-document
 *
 * Flexible document ingestion pipeline:
 *   1. Accept multipart file upload
 *   2. Extract raw text (pdf-parse / mammoth / GPT-4o Vision for images)
 *   3. Extract PII fields locally (never sent to AI) — data-protection compliance
 *   4. Sanitise remaining text, send to GPT-4o for classification + field extraction
 *   5. Map AI output to canonical schema fields
 *   6. Re-inject locally-held PII values
 *   7. Persist to assessment_documents if assessment_id provided
 *   8. Return ExtractionResult with confidence per field
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitResponse } from '@/lib/api/server-utils'
import { getOpenAIClient } from '@/lib/ai/openai'
import { INGEST_DOCUMENT_SYSTEM, INGEST_DOCUMENT_USER } from '@/lib/ai/prompts'
import { sanitiseForAI, summariseInput } from '@/lib/ai/sanitiser'
import { mapAIFields, extractPIILocally } from '@/lib/ai/field-mapper'
import type { ExtractionResult, DocumentType } from '@/lib/types/ingestion'

async function getAuth(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: orgMember, error } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()
  if (error || !orgMember) throw new Error('No org')
  return { orgId: orgMember.org_id as string, userId: user.id as string }
}

/** Extract text from a file buffer depending on mime type */
async function extractText(buffer: Buffer, mimeType: string, fileName: string, openai: any): Promise<string> {
  // PDF — use pdf-parse (local, no external API)
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const data = await parser.getText()
      return data.text
    } catch {
      return ''
    }
  }

  // Word doc (.docx) — use mammoth (local)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } catch {
      return ''
    }
  }

  // Plain text
  if (mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  // Images — use GPT-4o Vision to get text (image OCR)
  if (mimeType.startsWith('image/')) {
    try {
      const base64 = buffer.toString('base64')
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract ALL text from this document image exactly as it appears. Return only the raw text, preserving line structure. Do not summarise or interpret.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0,
      })
      return response.choices[0]?.message?.content ?? ''
    } catch {
      return ''
    }
  }

  return ''
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const limit = rateLimitResponse(request)
  if (limit) return limit

  try {
    const supabase = await createClient()
    const { orgId, userId } = await getAuth(supabase)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assessmentId = formData.get('assessment_id') as string | undefined
    const caseId = formData.get('case_id') as string | undefined

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const fileName = file.name || 'document'

    // ── Step 1: Store raw file ────────────────────────────────────────────
    const storagePath = `${orgId}/ingested/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    await supabase.storage
      .from('ingested-docs')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    // ── Step 2: Extract raw text ──────────────────────────────────────────
    const rawText = await extractText(buffer, mimeType, fileName, openai)

    if (!rawText.trim()) {
      return NextResponse.json({
        document_type: 'unknown',
        document_type_confidence: 'low',
        storage_path: storagePath,
      } satisfies Partial<ExtractionResult>)
    }

    // ── Step 3: Extract PII fields locally (never sent to AI) ─────────────
    const piiFields = extractPIILocally(rawText)

    // ── Step 4: Sanitise and send to AI ───────────────────────────────────
    const sanitised = sanitiseForAI(rawText, {
      insured_name: piiFields.insured_name?.value ?? undefined,
      contact_name: piiFields.insured_contact?.value ?? undefined,
    })

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: INGEST_DOCUMENT_SYSTEM },
        { role: 'user', content: INGEST_DOCUMENT_USER + sanitised },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const durationMs = Date.now() - startTime
    const aiContent = aiResponse.choices[0]?.message?.content ?? '{}'

    let aiParsed: { document_type: string; document_type_confidence: string; fields: Record<string, any> }
    try {
      aiParsed = JSON.parse(aiContent)
    } catch {
      aiParsed = { document_type: 'unknown', document_type_confidence: 'low', fields: {} }
    }

    // ── Step 5: Map AI fields to canonical schema ─────────────────────────
    const mappedFields = mapAIFields(aiParsed.fields ?? {})

    // ── Step 6: Merge PII fields back in ──────────────────────────────────
    const result: ExtractionResult = {
      document_type: (aiParsed.document_type as DocumentType) ?? 'unknown',
      document_type_confidence: (aiParsed.document_type_confidence as any) ?? 'low',
      storage_path: storagePath,
      ...mappedFields,
      ...piiFields,
    }

    // ── Step 7: Persist to assessment_documents ───────────────────────────
    let assessmentDocumentId: string | undefined

    if (assessmentId) {
      const { data: docRecord } = await supabase
        .from('assessment_documents')
        .insert({
          assessment_id: assessmentId,
          org_id: orgId,
          document_type: aiParsed.document_type === 'motor_assessment_instruction' ? 'assessment_report'
            : aiParsed.document_type === 'repairer_quote' ? 'repair_estimate'
            : aiParsed.document_type === 'parts_quote' ? 'parts_quote'
            : aiParsed.document_type === 'mm_valuation' ? 'mm_valuation'
            : 'other',
          ocr_status: 'complete',
          raw_ocr_text: rawText.slice(0, 10000),
          extracted_fields: result,
          confidence_score: aiParsed.document_type_confidence === 'high' ? 90
            : aiParsed.document_type_confidence === 'medium' ? 65 : 40,
        })
        .select('id')
        .single()

      assessmentDocumentId = docRecord?.id
      result.assessment_document_id = assessmentDocumentId
    }

    // ── Step 8: Data-protection audit log ──────────────────────────────────
    await supabase.from('ai_processing_log').insert({
      org_id: orgId,
      case_id: caseId || null,
      actor_user_id: userId,
      operation: 'ingest_document',
      input_summary: summariseInput('ingest_document', {
        text_length: sanitised.length,
        file: fileName,
      }),
      output_summary: `type=${result.document_type}, confidence=${result.document_type_confidence}`,
      model: 'gpt-4o',
      tokens_used: aiResponse.usage?.total_tokens ?? 0,
      duration_ms: durationMs,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
