/**
 * POST /api/ai/ocr
 *
 * Accepts a multipart file upload (image or PDF) and runs Google Vision
 * DOCUMENT_TEXT_DETECTION to extract raw text. Returns { text, confidence }.
 *
 * This endpoint is for the assessment tab drop zones (repairer quotes,
 * parts quotes, MM valuations). The full document ingestion pipeline
 * at /api/ai/ingest-document is a separate flow and is not affected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, serverError } from '@/lib/api/server-utils'
import { getVisionClient } from '@/lib/ai/google-vision'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/gif',
  'image/bmp',
  'application/pdf',
])

export async function POST(request: NextRequest) {
  try {
    const { error } = await getAuthContext()
    if (error) return error

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return serverError('file is required', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return serverError(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`, 400)
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!SUPPORTED_TYPES.has(mimeType)) {
      return serverError(
        `Unsupported file type: ${mimeType}. Accepted: JPEG, PNG, WebP, TIFF, GIF, BMP, PDF`,
        400,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const vision = getVisionClient()

    const [result] = await vision.documentTextDetection({
      image: { content: buffer },
      imageContext: {
        languageHints: ['en'],
      },
    })

    const fullAnnotation = result.fullTextAnnotation
    const text = fullAnnotation?.text ?? ''
    const confidence = fullAnnotation?.pages?.[0]?.confidence ?? 0

    return NextResponse.json({ text, confidence })
  } catch (err: any) {
    console.error('[OCR]', err)
    return serverError(err.message || 'OCR processing failed', 500)
  }
}
