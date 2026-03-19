/**
 * POST /api/ai/ocr-extract
 *
 * Accepts multipart form data (file + document_type) and extracts structured
 * fields from repairer quotations, parts quotes, and MM valuations.
 *
 * Pipeline:
 *   1. Extract raw text — pdf-parse for PDFs, mammoth for .docx, Google Vision for images
 *   2. Send raw text to GPT-4o with a document-type-specific prompt
 *   3. Return structured fields with per-field confidence scores
 *   4. Persist to assessment_documents if assessment_id is provided
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getOpenAIClient } from '@/lib/ai/openai'
import { sanitiseForAI } from '@/lib/ai/sanitiser'

const MAX_FILE_SIZE = 20 * 1024 * 1024

type DocumentType = 'mm_valuation' | 'repair_estimate' | 'parts_quote'

const VALID_DOC_TYPES = new Set<DocumentType>(['mm_valuation', 'repair_estimate', 'parts_quote'])

const EXTRACTION_PROMPTS: Record<DocumentType, string> = {
  mm_valuation: `You are a motor vehicle valuation data extractor.
Extract these fields from the document text:
- new_price (number, the new vehicle price / on-the-road price)
- retail_value (number)
- trade_value (number)
- market_value (number)
- identifier_type (string, the name of the valuation code system, e.g. "MM Code", "Glass's Code", "DAT Code")
- identifier_value (string, the valuation/identification code)
- make (string, vehicle manufacturer)
- model (string, vehicle model name)
- year (number, model year)
- valuation_date (string, ISO date if found)

Return JSON: { "fields": { ... }, "confidence": { "<field>": number 0-1 } }
Only include fields you can find. confidence = your certainty for each field.`,

  repair_estimate: `You are a motor vehicle repair estimate data extractor.
Extract these fields from the document text:
- repairer_name (string)
- repairer_contact (string, phone number)
- line_items (array of objects: { description, parts_cost, labour_hours, labour_rate, paint_cost })
  - costs are numbers (exclude VAT if distinguishable)
- total (number, total excl. VAT if available)

Return JSON: { "fields": { ... }, "confidence": { "<field>": number 0-1 } }
Only include fields you can find. confidence = your certainty for each field.`,

  parts_quote: `You are a motor vehicle parts quotation data extractor.
Extract these fields from the document text:
- supplier_name (string)
- supplier_contact (string, phone number)
- line_items (array of objects: { description, quantity, unit_price, total })
  - prices are numbers (in the document's local currency)
- total_amount (number, total excl. VAT if available)

Return JSON: { "fields": { ... }, "confidence": { "<field>": number 0-1 } }
Only include fields you can find. confidence = your certainty for each field.`,
}

async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ text: string; method: string }> {
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      if (data.text?.trim()) return { text: data.text, method: 'pdf-parse' }
    } catch { /* fall through */ }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.toLowerCase().endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      if (result.value?.trim()) return { text: result.value, method: 'mammoth' }
    } catch { /* fall through */ }
  }

  if (mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
    return { text: buffer.toString('utf-8'), method: 'text' }
  }

  if (mimeType.startsWith('image/')) {
    try {
      const { extractTextFromBuffer } = await import('@/lib/ai/google-vision')
      const text = await extractTextFromBuffer(buffer)
      if (text?.trim()) return { text, method: 'google-vision' }
    } catch (err: any) {
      if (err.message?.includes('not configured')) {
        return { text: '', method: 'vision-not-configured' }
      }
      throw err
    }
  }

  return { text: '', method: 'unsupported' }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { supabase, orgId, user, error } = await getAuthContext()
    if (error) return error

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('document_type') as string | null
    const assessmentId = formData.get('assessment_id') as string | null

    if (!file) return serverError('file is required', 400)
    if (file.size > MAX_FILE_SIZE) return serverError(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 400)
    if (!documentType || !VALID_DOC_TYPES.has(documentType as DocumentType)) {
      return serverError('document_type must be one of: mm_valuation, repair_estimate, parts_quote', 400)
    }

    const docType = documentType as DocumentType
    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const fileName = file.name || 'document'

    // Step 1: Extract raw text
    const { text: rawText, method } = await extractText(buffer, mimeType, fileName)

    if (method === 'vision-not-configured') {
      return NextResponse.json({
        error: 'Image OCR requires Google Vision setup. Upload a PDF instead, or configure GOOGLE_CLOUD_VISION_CREDENTIALS.',
        fields: null,
        raw_text: null,
      }, { status: 422 })
    }

    if (!rawText.trim()) {
      return NextResponse.json({
        fields: null,
        confidence: {},
        raw_text: '',
        note: 'No text could be extracted from this file. Try a clearer image or a text-based PDF.',
      })
    }

    // Step 2: GPT-4o structured extraction
    const openai = getOpenAIClient()
    const systemPrompt = EXTRACTION_PROMPTS[docType]

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitiseForAI(rawText.slice(0, 12000)) },
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const aiContent = aiResponse.choices[0]?.message?.content ?? '{}'
    let parsed: { fields?: Record<string, any>; confidence?: Record<string, number> }
    try {
      parsed = JSON.parse(aiContent)
    } catch {
      parsed = { fields: {}, confidence: {} }
    }

    const durationMs = Date.now() - startTime

    // Step 3: Persist to assessment_documents
    if (assessmentId && orgId) {
      await supabase
        .from('assessment_documents')
        .insert({
          assessment_id: assessmentId,
          org_id: orgId,
          document_type: docType,
          ocr_status: 'complete',
          raw_ocr_text: rawText.slice(0, 10000),
          extracted_fields: parsed.fields ?? {},
          confidence_score: averageConfidence(parsed.confidence),
        })
    }

    // Step 4: Data protection audit log
    if (orgId && user) {
      await supabase.from('ai_processing_log').insert({
        org_id: orgId,
        actor_user_id: user.id,
        operation: 'ocr_extract',
        input_summary: `OCR extract: ${docType}, file=${fileName}, method=${method}, text_len=${rawText.length}`,
        output_summary: `fields=${Object.keys(parsed.fields ?? {}).length}, avg_confidence=${averageConfidence(parsed.confidence)}`,
        model: 'gpt-4o',
        tokens_used: aiResponse.usage?.total_tokens ?? 0,
        duration_ms: durationMs,
      })
    }

    return NextResponse.json({
      fields: parsed.fields ?? {},
      confidence: parsed.confidence ?? {},
      raw_text: rawText.slice(0, 500),
      extraction_method: method,
      document_type: docType,
    })
  } catch (err: any) {
    console.error('[OCR-Extract]', err)
    return serverError(err.message || 'OCR extraction failed', 500)
  }
}

function averageConfidence(conf?: Record<string, number>): number {
  if (!conf) return 0
  const vals = Object.values(conf)
  if (vals.length === 0) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100)
}
