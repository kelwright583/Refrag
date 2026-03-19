export interface PdfOptions {
  format?: 'A4' | 'Letter'
  printBackground?: boolean
  margin?: {
    top: string
    bottom: string
    left: string
    right: string
  }
}

export interface PdfGenerationAdapter {
  generatePdf(html: string, options?: PdfOptions): Promise<Buffer>
}

const DEFAULT_OPTIONS: Required<PdfOptions> = {
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
}

// ---------------------------------------------------------------------------
// Playwright — headless Chromium PDF rendering
// ---------------------------------------------------------------------------

export class PlaywrightPdfAdapter implements PdfGenerationAdapter {
  async generatePdf(html: string, options?: PdfOptions): Promise<Buffer> {
    const { chromium } = await import('playwright')
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle' })

      const pdfBuffer = await page.pdf({
        format: opts.format,
        printBackground: opts.printBackground,
        margin: opts.margin,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}

// ---------------------------------------------------------------------------
// PDFKit fallback — basic HTML-to-PDF without a browser
// ---------------------------------------------------------------------------

export class PdfKitFallbackAdapter implements PdfGenerationAdapter {
  async generatePdf(html: string, options?: PdfOptions): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default
    const opts = { ...DEFAULT_OPTIONS, ...options }

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: opts.format,
          margins: {
            top: this.mmToPt(opts.margin.top),
            bottom: this.mmToPt(opts.margin.bottom),
            left: this.mmToPt(opts.margin.left),
            right: this.mmToPt(opts.margin.right),
          },
        })

        const chunks: Uint8Array[] = []
        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const plainText = this.stripHtml(html)
        doc.fontSize(11).text(plainText, { align: 'left' })
        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  private mmToPt(mm: string): number {
    const numeric = parseFloat(mm)
    return isNaN(numeric) ? 56.7 : numeric * 2.835
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '  • ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
}

// ---------------------------------------------------------------------------
// Stub — returns an empty buffer with a warning
// ---------------------------------------------------------------------------

export class StubPdfAdapter implements PdfGenerationAdapter {
  async generatePdf(_html: string, _options?: PdfOptions): Promise<Buffer> {
    console.warn(
      '[PDF stub] No PDF generation library available. Returning empty buffer.',
    )
    return Buffer.alloc(0)
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function getPdfGenerator(): Promise<PdfGenerationAdapter> {
  try {
    await import('playwright')
    return new PlaywrightPdfAdapter()
  } catch {
    // Playwright not installed — try pdfkit
  }

  try {
    await import('pdfkit')
    return new PdfKitFallbackAdapter()
  } catch {
    // pdfkit not installed either
  }

  console.warn(
    '[PDF] Neither playwright nor pdfkit available — using stub adapter.',
  )
  return new StubPdfAdapter()
}
