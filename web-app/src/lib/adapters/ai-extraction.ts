export interface FieldSchema {
  key: string
  label: string
  type: string
  required?: boolean
}

export interface ExtractionContext {
  documentRole: string
  vertical: string
}

export interface ExtractedField {
  value: string
  confidence: 'high' | 'medium' | 'low'
  source: string
}

export interface AiExtractionAdapter {
  extractFields(
    text: string,
    schema: FieldSchema[],
    context: ExtractionContext,
  ): Promise<Record<string, ExtractedField>>
}

// ---------------------------------------------------------------------------
// OpenAI — GPT-based field extraction
// ---------------------------------------------------------------------------

export class OpenAiExtractionAdapter implements AiExtractionAdapter {
  private apiKey: string

  constructor() {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OpenAiExtractionAdapter requires OPENAI_API_KEY env var')
    }
    this.apiKey = key
  }

  async extractFields(
    text: string,
    schema: FieldSchema[],
    context: ExtractionContext,
  ): Promise<Record<string, ExtractedField>> {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: this.apiKey })

    const schemaDescription = schema
      .map(
        (f) =>
          `- "${f.key}" (${f.label}): type=${f.type}${f.required ? ', required' : ''}`,
      )
      .join('\n')

    const systemPrompt = [
      `You are an expert data extractor for the ${context.vertical} industry.`,
      `The document is a "${context.documentRole}".`,
      `Extract the following fields from the text and return JSON with this shape:`,
      `{ "<key>": { "value": "<extracted value>", "confidence": "high"|"medium"|"low", "source": "<snippet from source text>" } }`,
      `Fields:\n${schemaDescription}`,
      `If a field cannot be found, omit it from the response.`,
      `Return ONLY valid JSON — no markdown, no commentary.`,
    ].join('\n')

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    return JSON.parse(raw) as Record<string, ExtractedField>
  }
}

// ---------------------------------------------------------------------------
// Stub — returns empty extraction results
// ---------------------------------------------------------------------------

export class StubExtractionAdapter implements AiExtractionAdapter {
  async extractFields(
    _text: string,
    schema: FieldSchema[],
    _context: ExtractionContext,
  ): Promise<Record<string, ExtractedField>> {
    console.warn(
      '[AI Extraction stub] No API key configured. Returning empty results for',
      schema.length,
      'fields.',
    )
    return {}
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getAiExtractor(): AiExtractionAdapter {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiExtractionAdapter()
  }
  console.warn('[AI Extraction] OPENAI_API_KEY not set — using stub adapter.')
  return new StubExtractionAdapter()
}
