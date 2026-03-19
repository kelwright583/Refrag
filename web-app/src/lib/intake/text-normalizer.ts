/**
 * Normalize raw OCR / extracted text into clean prose suitable for
 * both rule-based matching and AI field extraction.
 */

/** Common OCR artifacts to strip */
const ARTIFACT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Repeated non-alphanumeric characters (e.g. "=====", "-----", "*****")
  { pattern: /([=\-*_~#]{3,})/g, replacement: '' },
  // Form-feed / vertical-tab / null characters
  { pattern: /[\f\v\0]/g, replacement: '' },
  // Broken UTF-8 replacement characters
  { pattern: /\uFFFD/g, replacement: '' },
  // Excessive dots used as leader lines ("Name .........: John")
  { pattern: /\.{4,}/g, replacement: ':' },
  // Excessive underscores used as blank lines ("Name _______")
  { pattern: /_{4,}/g, replacement: '' },
  // Page number artifacts ("Page 1 of 3", "- 1 -")
  { pattern: /(?:^|\n)\s*(?:Page\s+\d+\s+of\s+\d+|- *\d+ *-)\s*(?:\n|$)/gi, replacement: '\n' },
]

/**
 * Normalize extracted text for downstream processing.
 *
 * 1. Strip common OCR artifacts
 * 2. Standardize line breaks to \n
 * 3. Collapse multiple blank lines into a single blank line
 * 4. Collapse multiple spaces into one
 * 5. Trim leading/trailing whitespace
 */
export function normalizeText(raw: string): string {
  let text = raw

  // Standardize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Strip artifacts
  for (const { pattern, replacement } of ARTIFACT_PATTERNS) {
    text = text.replace(pattern, replacement)
  }

  // Collapse multiple spaces (but preserve newlines)
  text = text.replace(/[^\S\n]+/g, ' ')

  // Collapse 3+ consecutive newlines to double newline
  text = text.replace(/\n{3,}/g, '\n\n')

  // Trim each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

  return text.trim()
}
