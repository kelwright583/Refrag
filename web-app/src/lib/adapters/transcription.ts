export interface TranscriptionOptions {
  language?: string
  model?: string
}

export interface TranscriptionAdapter {
  transcribe(
    audioBuffer: Buffer,
    options?: TranscriptionOptions,
  ): Promise<{ text: string; duration: number }>
}

// ---------------------------------------------------------------------------
// OpenAI Whisper — production transcription
// ---------------------------------------------------------------------------

export class OpenAiWhisperAdapter implements TranscriptionAdapter {
  private apiKey: string

  constructor() {
    const key = process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OpenAiWhisperAdapter requires OPENAI_API_KEY env var')
    }
    this.apiKey = key
  }

  async transcribe(
    audioBuffer: Buffer,
    options?: TranscriptionOptions,
  ): Promise<{ text: string; duration: number }> {
    const { default: OpenAI, toFile } = await import('openai')
    const client = new OpenAI({ apiKey: this.apiKey })

    const file = await toFile(audioBuffer, 'audio.webm', {
      type: 'audio/webm',
    })

    const response = await client.audio.transcriptions.create({
      file,
      model: options?.model ?? 'whisper-1',
      language: options?.language,
      response_format: 'verbose_json',
    })

    return {
      text: response.text,
      duration: response.duration ?? 0,
    }
  }
}

// ---------------------------------------------------------------------------
// Stub — returns empty transcription
// ---------------------------------------------------------------------------

export class StubTranscriptionAdapter implements TranscriptionAdapter {
  async transcribe(
    audioBuffer: Buffer,
    _options?: TranscriptionOptions,
  ): Promise<{ text: string; duration: number }> {
    console.warn(
      `[Transcription stub] Received ${audioBuffer.length} bytes — returning empty transcription.`,
    )
    return { text: '', duration: 0 }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getTranscriber(): TranscriptionAdapter {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiWhisperAdapter()
  }
  console.warn(
    '[Transcription] OPENAI_API_KEY not set — using stub adapter.',
  )
  return new StubTranscriptionAdapter()
}
