import { ImageAnnotatorClient } from '@google-cloud/vision'

let _client: ImageAnnotatorClient | null = null

export function getVisionClient(): ImageAnnotatorClient {
  if (!_client) {
    const apiKey = process.env.GOOGLE_VISION_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_VISION_API_KEY environment variable is not set')
    }
    _client = new ImageAnnotatorClient({ apiKey })
  }
  return _client
}
