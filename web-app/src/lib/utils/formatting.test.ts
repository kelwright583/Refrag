import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTime,
  getCurrencySymbol,
} from './formatting'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'en-US', 'USD')
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('formats ZAR correctly', () => {
    const result = formatCurrency(1234.56, 'en-ZA', 'ZAR')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('formats GBP correctly', () => {
    const result = formatCurrency(1234.56, 'en-GB', 'GBP')
    expect(result).toContain('1,234.56')
    expect(result).toContain('£')
  })

  it('formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'de-DE', 'EUR')
    expect(result).toContain('1.234,56')
  })

  it('returns "-" for null amount', () => {
    expect(formatCurrency(null)).toBe('-')
  })

  it('returns "-" for undefined amount', () => {
    expect(formatCurrency(undefined)).toBe('-')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'en-US', 'USD')
    expect(result).toContain('0.00')
  })

  it('formats negative amount', () => {
    const result = formatCurrency(-500.5, 'en-US', 'USD')
    expect(result).toContain('500.50')
  })

  it('uses default locale and currency when not provided', () => {
    const result = formatCurrency(100)
    expect(typeof result).toBe('string')
    expect(result).toContain('100')
  })

  it('falls back gracefully for invalid locale', () => {
    const result = formatCurrency(100, 'invalid-locale-xyz', 'USD')
    expect(typeof result).toBe('string')
    expect(result).toContain('100')
  })
})

describe('formatNumber', () => {
  it('formats a number with default locale', () => {
    expect(formatNumber(1234567)).toContain('1')
  })

  it('returns "-" for null', () => {
    expect(formatNumber(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatNumber(undefined)).toBe('-')
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2025-03-15', 'en-US')
    expect(result).toContain('Mar')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('formats Date object', () => {
    const result = formatDate(new Date(2025, 0, 20), 'en-US')
    expect(result).toContain('Jan')
    expect(result).toContain('20')
    expect(result).toContain('2025')
  })

  it('formats with different locale (en-GB)', () => {
    const result = formatDate('2025-06-15', 'en-GB')
    expect(result).toContain('Jun')
    expect(result).toContain('2025')
  })

  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatDate(undefined)).toBe('-')
  })

  it('returns "-" for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('-')
  })

  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-')
  })
})

describe('formatDateTime', () => {
  it('formats a date with time', () => {
    const result = formatDateTime('2025-03-15T14:30:00Z', 'en-US')
    expect(result).toContain('Mar')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('returns "-" for null', () => {
    expect(formatDateTime(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('-')
  })

  it('returns "-" for invalid date', () => {
    expect(formatDateTime('garbage')).toBe('-')
  })
})

describe('formatTime', () => {
  it('formats time portion of a datetime', () => {
    const result = formatTime('2025-03-15T14:30:00Z', 'en-US')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toBe('-')
  })

  it('returns "-" for null', () => {
    expect(formatTime(null)).toBe('-')
  })

  it('returns "-" for undefined', () => {
    expect(formatTime(undefined)).toBe('-')
  })

  it('returns "-" for invalid date', () => {
    expect(formatTime('not-a-time')).toBe('-')
  })
})

describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    const result = getCurrencySymbol('en-US', 'USD')
    expect(result).toBe('$')
  })

  it('returns R for ZAR', () => {
    const result = getCurrencySymbol('en-ZA', 'ZAR')
    expect(result).toBe('R')
  })

  it('returns £ for GBP', () => {
    const result = getCurrencySymbol('en-GB', 'GBP')
    expect(result).toBe('£')
  })

  it('returns € for EUR', () => {
    const result = getCurrencySymbol('de-DE', 'EUR')
    expect(result).toContain('€')
  })

  it('falls back to currency code for unknown currency', () => {
    const result = getCurrencySymbol('en', 'XYZ')
    expect(typeof result).toBe('string')
  })

  it('uses default locale and currency when not provided', () => {
    const result = getCurrencySymbol()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
