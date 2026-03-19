export interface OcrAdapter {
  extractText(buffer: Buffer, contentType: string): Promise<string>
}

// ---------------------------------------------------------------------------
// Google Cloud Vision — image-based OCR
// ---------------------------------------------------------------------------

export class GoogleVisionAdapter implements OcrAdapter {
  private credentials: Record<string, unknown>

  constructor() {
    const raw = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS
    if (!raw) {
      throw new Error(
        'GoogleVisionAdapter requires GOOGLE_CLOUD_VISION_CREDENTIALS env var',
      )
    }
    this.credentials = JSON.parse(raw)
  }

  async extractText(buffer: Buffer, _contentType: string): Promise<string> {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const client = new ImageAnnotatorClient({ credentials: this.credentials })

    const [result] = await client.textDetection({ image: { content: buffer } })
    const annotations = result.textAnnotations
    if (!annotations || annotations.length === 0) {
      return ''
    }
    return annotations[0].description?.trim() ?? ''
  }
}

// ---------------------------------------------------------------------------
// pdf-parse — PDF text extraction (no API key needed)
// ---------------------------------------------------------------------------

export class PdfParseAdapter implements OcrAdapter {
  async extractText(buffer: Buffer, _contentType: string): Promise<string> {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text.trim()
  }
}

// ---------------------------------------------------------------------------
// Mammoth — DOCX text extraction (no API key needed)
// ---------------------------------------------------------------------------

export class MammothAdapter implements OcrAdapter {
  async extractText(buffer: Buffer, _contentType: string): Promise<string> {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }
}

// ---------------------------------------------------------------------------
// Stub — returns empty string, used when no adapter is available
// ---------------------------------------------------------------------------

export class StubOcrAdapter implements OcrAdapter {
  async extractText(_buffer: Buffer, contentType: string): Promise<string> {
    console.warn(
      `[OCR stub] No adapter configured for content type "${contentType}". Returning empty text.`,
    )
    return ''
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
]

export function getOcrAdapter(contentType: string): OcrAdapter {
  if (contentType === 'application/pdf') {
    return new PdfParseAdapter()
  }

  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    return new MammothAdapter()
  }

  if (IMAGE_TYPES.includes(contentType)) {
    if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
      return new GoogleVisionAdapter()
    }
    console.warn(
      '[OCR] GOOGLE_CLOUD_VISION_CREDENTIALS not set — image OCR unavailable, using stub.',
    )
    return new StubOcrAdapter()
  }

  return new StubOcrAdapter()
}
