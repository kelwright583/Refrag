export interface PiiMatch {
  key: string
  value: string
  start: number
  end: number
}

interface PiiPattern {
  key: string
  pattern: RegExp
  replacement: string
}

const PII_PATTERNS: PiiPattern[] = [
  {
    key: 'id_number',
    pattern: /\b\d{13}\b/g,
    replacement: '[ID_NUMBER]',
  },
  {
    key: 'phone',
    pattern:
      /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
    replacement: '[PHONE]',
  },
  {
    key: 'email',
    pattern: /[\w.-]+@[\w.-]+\.\w{2,}/g,
    replacement: '[EMAIL]',
  },
  {
    key: 'passport',
    pattern: /\b[A-Z]\d{8}\b/g,
    replacement: '[PASSPORT]',
  },
  {
    key: 'bank_account',
    pattern: /\b\d{8,12}\b(?=\s*(?:account|acc|a\/c))/gi,
    replacement: '[BANK_ACCOUNT]',
  },
]

/**
 * Scan text for PII matches without modifying it.
 * Returns an array of detected PII items with their positions.
 */
export function detectPii(
  text: string,
): PiiMatch[] {
  const matches: PiiMatch[] = []

  for (const { key, pattern } of PII_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      matches.push({
        key,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }

  matches.sort((a, b) => a.start - b.start)
  return matches
}

/**
 * Strip all detected PII from text, replacing with bracketed placeholders.
 * Returns the sanitized text and the list of PII values that were removed.
 */
export function stripPii(
  text: string,
): { sanitized: string; piiFields: Array<{ key: string; value: string }> } {
  const piiFields: Array<{ key: string; value: string }> = []
  let sanitized = text

  for (const { key, pattern, replacement } of PII_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      piiFields.push({ key, value: match[0] })
    }
    sanitized = sanitized.replace(re, replacement)
  }

  return { sanitized, piiFields }
}
