/**
 * PII Sanitiser — strips personally identifiable information before sending to AI
 * POPIA compliance: no names, ID numbers, phone numbers, emails, or addresses
 * should be sent to external AI services.
 */

/** Regex patterns for common PII */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // SA ID numbers (13 digits)
  { pattern: /\b\d{13}\b/g, replacement: '[ID_REDACTED]' },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  // SA phone numbers (10-11 digits, various formats)
  { pattern: /\b(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
  // Generic phone (7-15 digits with optional spaces/dashes)
  { pattern: /\b\d[\d\s\-]{6,14}\d\b/g, replacement: '[PHONE_REDACTED]' },
  // SA postal codes (4 digits at end of address context)
  // Passport numbers (typically alphanumeric 6-9 chars — keep generic)
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
