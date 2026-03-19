/**
 * POST /api/intake/process
 *
 * Unified OCR intake pipeline. Every document upload flows through here:
 *
 *   1. Store file in Supabase Storage (ingested-docs bucket)
 *   2. Create intake_documents record (status: processing)
 *   3. Detect content type → route to extraction adapter
 *        PDF with text    → pdf-parse
 *        Scanned PDF/Image → Google Cloud Vision documentTextDetection
 *        Word .docx       → mammoth
 *   4. Normalize extracted text
 *   5. Rule-based field extraction via label dictionaries
 *   6. PII detection (regex — never sent to AI)
 *   7. Strip PII, call AI extraction for missing/low-confidence fields
 *   8. Build extracted_fields with confidence scores
 *   9. Update intake_documents record with results
 *  10. Return ExtractionResult to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { trackServerEvent } from '@/lib/events'
import { getOcrAdapter, getStorageAdapter, getAiExtractor } from '@/lib/adapters'
import { GoogleVisionAdapter } from '@/lib/adapters/ocr'
import { getSchemaForRole, getNonPiiFields } from '@/lib/intake/extraction-schemas'
import { normalizeText } from '@/lib/intake/text-normalizer'
import { matchLabels } from '@/lib/intake/label-matcher'
import { stripPii } from '@/lib/intake/pii-detector'
import type { FieldSchema } from '@/lib/intake/extraction-schemas'
import type { ExtractedField } from '@/lib/adapters/ai-extraction'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
])

const VALID_ROLES = new Set([
  'instruction',
  'valuation_printout',
  'repairer_quote',
  'parts_quote',
  'statement',
  'evidence_photo',
  'other',
])

export interface IntakeExtractionResult {
  intake_document_id: string | null
  storage_path: string
  document_role: string
  extracted_fields: Record<string, IntakeExtractedField>
  raw_text_preview: string
  extraction_method: string
  processing_time_ms: number
}

export interface IntakeExtractedField {
  value: string
  confidence: 'high' | 'medium' | 'low'
  source: string
  is_pii?: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Text extraction routing
// ────────────────────────────────────────────────────────────────────────────

async function extractText(
  buffer: Buffer,
  contentType: string,
): Promise<{ text: string; method: string }> {
  // PDF: try pdf-parse first, fall back to Vision if no text layer
  if (contentType === 'application/pdf') {
    const pdfAdapter = getOcrAdapter('application/pdf')
    const text = await pdfAdapter.extractText(buffer, contentType)
    if (text.trim()) {
      return { text, method: 'pdf-parse' }
    }
    // Scanned PDF — fall back to Vision OCR if available
    if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
      const visionAdapter = new GoogleVisionAdapter()
      const visionText = await visionAdapter.extractText(buffer, contentType)
      return { text: visionText, method: 'google-vision' }
    }
    return { text: '', method: 'pdf-parse-empty' }
  }

  // Images → Google Vision
  if (IMAGE_TYPES.has(contentType)) {
    const adapter = getOcrAdapter(contentType)
    const text = await adapter.extractText(buffer, contentType)
    return { text, method: text ? 'google-vision' : 'vision-unavailable' }
  }

  // Word docs → mammoth
  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    const adapter = getOcrAdapter(contentType)
    const text = await adapter.extractText(buffer, contentType)
    return { text, method: 'mammoth' }
  }

  // Plain text
  if (contentType === 'text/plain') {
    return { text: buffer.toString('utf-8'), method: 'plaintext' }
  }

  // Unknown — try pdf-parse as a heuristic, then give up
  try {
    const adapter = getOcrAdapter('application/pdf')
    const text = await adapter.extractText(buffer, 'application/pdf')
    if (text.trim()) return { text, method: 'pdf-parse-fallback' }
  } catch {
    // ignore
  }

  return { text: '', method: 'unsupported' }
}

// ────────────────────────────────────────────────────────────────────────────
// POST handler
// ────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { supabase, user, orgId, error } = await getAuthContext()
    if (error) return error

    // ── Parse form data ──────────────────────────────────────────────────
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null
    const assessmentId = formData.get('assessmentId') as string | null
    const documentRole = formData.get('documentRole') as string | null
    const vertical = formData.get('vertical') as string | 'motor'

    if (!file) return serverError('file is required', 400)
    if (!caseId) return serverError('caseId is required', 400)
    if (file.size > MAX_FILE_SIZE) {
      return serverError(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 400)
    }

    const role = VALID_ROLES.has(documentRole ?? '') ? documentRole! : 'other'
    const buffer = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || 'application/octet-stream'
    const fileName = file.name || 'document'
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')

    // ── Step 1: Upload to Supabase Storage ───────────────────────────────
    const storagePath = `${orgId}/${caseId}/${Date.now()}-${safeName}`
    const storage = getStorageAdapter()
    await storage.upload('ingested-docs', storagePath, buffer, contentType)

    // ── Step 2: Create intake_documents record ───────────────────────────
    let intakeDocId: string | null = null
    try {
      const { data: docRecord } = await supabase
        .from('intake_documents')
        .insert({
          org_id: orgId,
          case_id: caseId,
          assessment_id: assessmentId || null,
          document_role: role,
          file_name: fileName,
          content_type: contentType,
          storage_path: storagePath,
          status: 'processing',
          uploaded_by: user!.id,
        })
        .select('id')
        .single()
      intakeDocId = docRecord?.id ?? null
    } catch {
      // Table may not exist yet — continue without tracking record
    }

    // ── Step 3: Extract text ─────────────────────────────────────────────
    const { text: rawText, method } = await extractText(buffer, contentType)

    if (!rawText.trim()) {
      // Update record as failed
      if (intakeDocId) {
        await supabase
          .from('intake_documents')
          .update({
            status: 'failed',
            error_message: 'No text could be extracted from this file',
          })
          .eq('id', intakeDocId)
      }
      return NextResponse.json({
        intake_document_id: intakeDocId,
        storage_path: storagePath,
        document_role: role,
        extracted_fields: {},
        raw_text_preview: '',
        extraction_method: method,
        processing_time_ms: Date.now() - startTime,
      } satisfies IntakeExtractionResult)
    }

    // ── Step 4: Normalize text ───────────────────────────────────────────
    const normalizedText = normalizeText(rawText)

    // ── Step 5: Rule-based field extraction ──────────────────────────────
    const schema = getSchemaForRole(role)
    const ruleMatches = matchLabels(normalizedText, schema)

    // ── Step 6: PII detection ────────────────────────────────────────────
    const { sanitized: piiStrippedText, piiFields } = stripPii(normalizedText)

    // Build the PII fields map (these were extracted locally and stay local)
    const piiExtracted: Record<string, IntakeExtractedField> = {}
    for (const pii of piiFields) {
      const schemaField = schema.find((f) => f.isPii && f.key === pii.key)
      if (schemaField) {
        piiExtracted[pii.key] = {
          value: pii.value,
          confidence: 'high',
          source: 'regex-pii',
          is_pii: true,
        }
      }
    }

    // Identify PII fields from rule matches too
    const piiSchemaKeys = new Set(schema.filter((f) => f.isPii).map((f) => f.key))
    for (const [key, match] of Object.entries(ruleMatches)) {
      if (piiSchemaKeys.has(key)) {
        piiExtracted[key] = {
          value: match.value,
          confidence: match.confidence,
          source: match.source,
          is_pii: true,
        }
      }
    }

    // ── Step 7: AI extraction for remaining fields ───────────────────────
    const ruleMatchedKeys = new Set(Object.keys(ruleMatches))
    const piiKeys = new Set(Object.keys(piiExtracted))
    const missingFields = getNonPiiFields(schema).filter(
      (f) => !ruleMatchedKeys.has(f.key) || ruleMatches[f.key]?.confidence === 'low',
    )

    let aiFields: Record<string, ExtractedField> = {}
    if (missingFields.length > 0 && piiStrippedText.trim().length > 20) {
      try {
        const aiExtractor = getAiExtractor()
        const aiSchema: FieldSchema[] = missingFields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
        }))
        aiFields = await aiExtractor.extractFields(
          piiStrippedText.slice(0, 12000),
          aiSchema,
          { documentRole: role, vertical: vertical || 'motor' },
        )
      } catch (err) {
        console.error('[Intake] AI extraction failed, continuing with rule-based results:', err)
      }
    }

    // ── Step 8: Merge all fields with confidence scores ──────────────────
    const extractedFields: Record<string, IntakeExtractedField> = {}

    // Add rule-based matches (non-PII)
    for (const [key, match] of Object.entries(ruleMatches)) {
      if (!piiKeys.has(key)) {
        extractedFields[key] = {
          value: match.value,
          confidence: match.confidence,
          source: match.source,
        }
      }
    }

    // Add AI-extracted fields (only if rule-based didn't already find a high-confidence match)
    for (const [key, field] of Object.entries(aiFields)) {
      if (!extractedFields[key] || extractedFields[key].confidence !== 'high') {
        extractedFields[key] = {
          value: field.value,
          confidence: field.confidence,
          source: field.source ?? 'ai',
        }
      }
    }

    // Merge PII fields (always take precedence since they're extracted locally)
    for (const [key, field] of Object.entries(piiExtracted)) {
      extractedFields[key] = field
    }

    // ── Step 9: Update intake_documents record ───────────────────────────
    if (intakeDocId) {
      await supabase
        .from('intake_documents')
        .update({
          status: 'complete',
          raw_text: normalizedText.slice(0, 15000),
          extracted_fields: extractedFields,
          extraction_method: method,
          field_count: Object.keys(extractedFields).length,
          confidence_summary: buildConfidenceSummary(extractedFields),
          processing_time_ms: Date.now() - startTime,
        })
        .eq('id', intakeDocId)
    }

    // ── Step 10: Audit log ───────────────────────────────────────────────
    try {
      await supabase.from('ai_processing_log').insert({
        org_id: orgId,
        case_id: caseId,
        actor_user_id: user!.id,
        operation: 'intake_process',
        input_summary: `role=${role}, file=${fileName}, method=${method}, text_len=${normalizedText.length}`,
        output_summary: `fields=${Object.keys(extractedFields).length}, ${buildConfidenceSummary(extractedFields)}`,
        model: Object.keys(aiFields).length > 0 ? 'gpt-4o' : 'none',
        tokens_used: 0,
        duration_ms: Date.now() - startTime,
      })
    } catch {
      // Audit log is best-effort
    }

    trackServerEvent('document_dropped', {
      case_id: caseId,
      document_role: role,
      file_name: fileName,
      extraction_method: method,
      field_count: Object.keys(extractedFields).length,
    }, { orgId: orgId!, userId: user!.id, vertical: vertical || undefined })

    // ── Return result ────────────────────────────────────────────────────
    const result: IntakeExtractionResult = {
      intake_document_id: intakeDocId,
      storage_path: storagePath,
      document_role: role,
      extracted_fields: extractedFields,
      raw_text_preview: normalizedText.slice(0, 500),
      extraction_method: method,
      processing_time_ms: Date.now() - startTime,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Intake processing failed'
    console.error('[Intake]', err)
    return serverError(message, 500)
  }
}

function buildConfidenceSummary(
  fields: Record<string, IntakeExtractedField>,
): string {
  let high = 0
  let medium = 0
  let low = 0
  for (const f of Object.values(fields)) {
    if (f.confidence === 'high') high++
    else if (f.confidence === 'medium') medium++
    else low++
  }
  return `high=${high}, medium=${medium}, low=${low}`
}
