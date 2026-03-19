import { describe, it, expect } from 'vitest'
import { detectPii, stripPii } from './pii-detector'

describe('detectPii', () => {
  describe('phone number detection', () => {
    it('detects a standard South African mobile number', () => {
      const matches = detectPii('Call me at 082 123 4567 please')
      const phones = matches.filter((m) => m.key === 'phone')
      expect(phones.length).toBeGreaterThanOrEqual(1)
      expect(phones[0].value).toContain('082')
    })

    it('detects international format with + prefix', () => {
      const matches = detectPii('Phone: +27 82 123 4567')
      const phones = matches.filter((m) => m.key === 'phone')
      expect(phones.length).toBeGreaterThanOrEqual(1)
    })

    it('detects number with dashes', () => {
      const matches = detectPii('Tel: 021-555-1234')
      const phones = matches.filter((m) => m.key === 'phone')
      expect(phones.length).toBeGreaterThanOrEqual(1)
    })

    it('detects number with dots', () => {
      const matches = detectPii('Mobile: 082.123.4567')
      const phones = matches.filter((m) => m.key === 'phone')
      expect(phones.length).toBeGreaterThanOrEqual(1)
    })

    it('detects UK-style number', () => {
      const matches = detectPii('Contact: +44 20 7946 0958')
      const phones = matches.filter((m) => m.key === 'phone')
      expect(phones.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('email detection', () => {
    it('detects a standard email address', () => {
      const matches = detectPii('Email: john.doe@example.com')
      const emails = matches.filter((m) => m.key === 'email')
      expect(emails.length).toBe(1)
      expect(emails[0].value).toBe('john.doe@example.com')
    })

    it('detects email with subdomain', () => {
      const matches = detectPii('Send to user@mail.company.co.za')
      const emails = matches.filter((m) => m.key === 'email')
      expect(emails.length).toBe(1)
      expect(emails[0].value).toBe('user@mail.company.co.za')
    })
  })

  describe('ID number detection (13-digit)', () => {
    it('detects a 13-digit SA ID number', () => {
      const matches = detectPii('ID: 9001015009087')
      const ids = matches.filter((m) => m.key === 'id_number')
      expect(ids.length).toBe(1)
      expect(ids[0].value).toBe('9001015009087')
    })

    it('does not match numbers shorter than 13 digits', () => {
      const matches = detectPii('Not an ID: 123456789012')
      const ids = matches.filter((m) => m.key === 'id_number')
      expect(ids.length).toBe(0)
    })

    it('does not match numbers longer than 13 digits', () => {
      const matches = detectPii('Not an ID: 90010150090871')
      const ids = matches.filter((m) => m.key === 'id_number')
      expect(ids.length).toBe(0)
    })
  })

  describe('passport number detection', () => {
    it('detects a passport number (letter + 8 digits)', () => {
      const matches = detectPii('Passport: A12345678')
      const passports = matches.filter((m) => m.key === 'passport')
      expect(passports.length).toBe(1)
      expect(passports[0].value).toBe('A12345678')
    })

    it('does not match lowercase letter prefix', () => {
      const matches = detectPii('Ref: a12345678')
      const passports = matches.filter((m) => m.key === 'passport')
      expect(passports.length).toBe(0)
    })
  })

  describe('multiple PII types in same text', () => {
    it('detects ID, email, and phone in one block', () => {
      const text = `
        Name: John Smith
        ID: 9001015009087
        Email: john@test.com
        Phone: 082 555 1234
      `
      const matches = detectPii(text)
      const keys = new Set(matches.map((m) => m.key))
      expect(keys.has('id_number')).toBe(true)
      expect(keys.has('email')).toBe(true)
      expect(keys.has('phone')).toBe(true)
    })

    it('returns matches sorted by start position', () => {
      const text = 'Call 082 555 1234 or email john@test.com for ID 9001015009087'
      const matches = detectPii(text)
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].start).toBeGreaterThanOrEqual(matches[i - 1].start)
      }
    })
  })

  describe('non-PII text preserved', () => {
    it('returns empty array for text without PII', () => {
      const text = 'This is a regular report about vehicle damage assessment.'
      const matches = detectPii(text)
      expect(matches.length).toBe(0)
    })
  })
})

describe('stripPii', () => {
  it('replaces ID number with placeholder', () => {
    const { sanitized, piiFields } = stripPii('ID: 9001015009087')
    expect(sanitized).toContain('[ID_NUMBER]')
    expect(sanitized).not.toContain('9001015009087')
    expect(piiFields.some((f) => f.key === 'id_number')).toBe(true)
  })

  it('replaces email with placeholder', () => {
    const { sanitized } = stripPii('Contact: john@example.com')
    expect(sanitized).toContain('[EMAIL]')
    expect(sanitized).not.toContain('john@example.com')
  })

  it('replaces phone with placeholder', () => {
    const { sanitized } = stripPii('Call 082 555 1234')
    expect(sanitized).toContain('[PHONE]')
  })

  it('replaces passport digits (phone pattern takes precedence in strip ordering)', () => {
    const { sanitized } = stripPii('Passport number is A12345678 issued in Pretoria')
    // Phone regex matches the 8-digit sequence before passport can; digits are still stripped
    expect(sanitized).not.toContain('12345678')
  })

  it('detects passport in detectPii even when phone also matches', () => {
    const matches = detectPii('Passport number is A12345678')
    const passports = matches.filter((m) => m.key === 'passport')
    expect(passports.length).toBe(1)
    expect(passports[0].value).toBe('A12345678')
  })

  it('preserves non-PII text', () => {
    const text = 'The vehicle is a 2022 Toyota Corolla in white.'
    const { sanitized } = stripPii(text)
    expect(sanitized).toBe(text)
  })

  it('strips multiple PII types simultaneously', () => {
    const text = 'ID: 9001015009087 Email: j@test.com Phone: 082 555 1234'
    const { sanitized, piiFields } = stripPii(text)
    expect(sanitized).toContain('[ID_NUMBER]')
    expect(sanitized).toContain('[EMAIL]')
    expect(sanitized).toContain('[PHONE]')
    expect(piiFields.length).toBeGreaterThanOrEqual(3)
  })

  it('returns all stripped PII values in piiFields', () => {
    const { piiFields } = stripPii('ID: 9001015009087 and email test@a.com')
    const keys = piiFields.map((f) => f.key)
    expect(keys).toContain('id_number')
    expect(keys).toContain('email')
    const idField = piiFields.find((f) => f.key === 'id_number')
    expect(idField?.value).toBe('9001015009087')
  })
})
