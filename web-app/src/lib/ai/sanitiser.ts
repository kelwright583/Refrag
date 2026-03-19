/**
 * PII Sanitiser — strips personally identifiable information before sending to AI.
 * Privacy compliance: no names, ID numbers, phone numbers, emails, or addresses
 * should be sent to external AI services.
 */

/** Regex patterns for common PII (international formats) */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // National ID numbers — 9–13 digit sequences (covers most jurisdictions)
  { pattern: /\b\d{9,13}\b/g, replacement: '[ID_REDACTED]' },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  // International phone numbers (with country code prefix +XX or +XXX)
  { pattern: /\b\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{2,4}[\s\-]?\d{3,4}\b/g, replacement: '[PHONE_REDACTED]' },
  // Local phone numbers (leading 0 or parenthesised area code)
  { pattern: /\b(?:0|\(\d{1,4}\))\s*\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/g, replacement: '[PHONE_REDACTED]' },
  // Generic digit sequence that looks like phone/account (7-15 digits with optional spaces/dashes)
  { pattern: /\b\d[\d\s\-]{6,14}\d\b/g, replacement: '[PHONE_REDACTED]' },
  // Passport numbers (alphanumeric 6-9 chars — kept generic)
  // Bank account numbers (7-16 digits — overlaps with phone, handled above)
]

/**
 * Named entity patterns — names are harder to regex, so we replace
 * known fields if provided.
 */
interface KnownPII {
  insured_name?: string
  contact_name?: string
  broker_name?: string
  insurer_contact_name?: string
  address?: string
  [key: string]: string | undefined
}

/**
 * Sanitise a text string, removing PII.
 *
 * @param text - raw text to sanitise
 * @param knownPII - known PII values to explicitly redact
 * @returns sanitised text safe for AI processing
 */
export function sanitiseForAI(text: string, knownPII?: KnownPII): string {
  let result = text

  // Replace known PII values first (exact match)
  if (knownPII) {
    for (const [key, value] of Object.entries(knownPII)) {
      if (value && value.length > 2) {
        const label = key.replace(/_/g, ' ').toUpperCase()
        // Case-insensitive replacement
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        result = result.replace(new RegExp(escaped, 'gi'), `[${label}_REDACTED]`)
      }
    }
  }

  // Apply regex patterns
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement)
  }

  return result
}

/**
 * Generate a non-PII summary of what was sent to AI (for audit log)
 */
export function summariseInput(operation: string, details: Record<string, unknown>): string {
  const parts = [`operation=${operation}`]
  if (details.image_count) parts.push(`images=${details.image_count}`)
  if (details.text_length) parts.push(`text_chars=${details.text_length}`)
  if (details.field) parts.push(`field=${details.field}`)
  return parts.join(', ')
}
