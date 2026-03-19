/**
 * Google Cloud Vision client for OCR text extraction.
 *
 * Supports two auth modes:
 * 1. GOOGLE_CLOUD_VISION_CREDENTIALS env var (JSON string of service account key)
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON file)
 *
 * You will need to set one of these after creating a service account in Google Cloud Console.
 */
import { ImageAnnotatorClient } from '@google-cloud/vision'

let _client: ImageAnnotatorClient | null = null

export function getVisionClient(): ImageAnnotatorClient {
  if (!_client) {
    const credentialsJson = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson)
        _client = new ImageAnnotatorClient({ credentials })
      } catch {
        throw new Error('GOOGLE_CLOUD_VISION_CREDENTIALS contains invalid JSON')
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      _client = new ImageAnnotatorClient()
    } else {
      throw new Error(
        'Google Vision is not configured. Set GOOGLE_CLOUD_VISION_CREDENTIALS (JSON string) ' +
        'or GOOGLE_APPLICATION_CREDENTIALS (path to service account file).'
      )
    }
  }
  return _client
}

/**
 * Extract text from an image or PDF buffer using Google Cloud Vision OCR.
 */
export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const client = getVisionClient()
  const [result] = await client.documentTextDetection({ image: { content: buffer } })
  return result.fullTextAnnotation?.text ?? ''
}
