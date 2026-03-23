export interface OcrAdapter {
  extractText(buffer: Buffer, contentType: string): Promise<string>
}

// ---------------------------------------------------------------------------
// Google Cloud Vision — image-based OCR (service account JSON credentials)
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
// Google Cloud Vision — API key variant (uses GOOGLE_VISION_API_KEY)
// ---------------------------------------------------------------------------

export class GoogleVisionApiKeyAdapter implements OcrAdapter {
  private apiKey: string

  constructor() {
    const key = process.env.GOOGLE_VISION_API_KEY
    if (!key) {
      throw new Error(
        'GoogleVisionApiKeyAdapter requires GOOGLE_VISION_API_KEY env var',
      )
    }
    this.apiKey = key
  }

  async extractText(buffer: Buffer, _contentType: string): Promise<string> {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const client = new ImageAnnotatorClient({ apiKey: this.apiKey })

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
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text.trim()
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
  // 1. Try Google Vision first (API key variant) if env var is set
  if (process.env.GOOGLE_VISION_API_KEY) {
    try {
      return new GoogleVisionApiKeyAdapter()
    } catch {
      // Package not installed or instantiation failed — fall through
    }
  }

  // Also support service account JSON credentials for Google Vision
  if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
    try {
      return new GoogleVisionAdapter()
    } catch {
      // Package not installed or credentials invalid — fall through
    }
  }

  // 2. Fall back to PdfParseAdapter for PDFs
  if (contentType === 'application/pdf') {
    return new PdfParseAdapter()
  }

  // 3. Fall back to MammothAdapter for DOCX/DOC
  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    return new MammothAdapter()
  }

  // 4. Fall back to StubOcrAdapter for everything else
  if (IMAGE_TYPES.includes(contentType)) {
    console.warn(
      '[OCR] No Google Vision credentials set — image OCR unavailable, using stub.',
    )
  }
  return new StubOcrAdapter()
}
