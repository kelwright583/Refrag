import { describe, it, expect } from 'vitest'
import { normalizeText } from './text-normalizer'

describe('normalizeText', () => {
  describe('OCR artifact removal', () => {
    it('removes repeated equals signs', () => {
      const result = normalizeText('Header\n=====\nBody')
      expect(result).not.toContain('=====')
      expect(result).toContain('Header')
      expect(result).toContain('Body')
    })

    it('removes repeated dashes', () => {
      const result = normalizeText('Section\n------\nContent')
      expect(result).not.toContain('------')
    })

    it('removes repeated asterisks', () => {
      const result = normalizeText('Title\n*****\nText')
      expect(result).not.toContain('*****')
    })

    it('replaces excessive dots with colon', () => {
      const result = normalizeText('Name .........: John')
      expect(result).toContain(':')
      expect(result).not.toContain('.........')
    })

    it('removes excessive underscores', () => {
      const result = normalizeText('Signature: _________')
      expect(result).not.toContain('_________')
    })

    it('removes broken UTF-8 replacement characters', () => {
      const result = normalizeText('Hello \uFFFD world')
      expect(result).not.toContain('\uFFFD')
      expect(result).toContain('Hello')
      expect(result).toContain('world')
    })

    it('removes form-feed and vertical-tab characters', () => {
      const result = normalizeText('Before\f\vAfter')
      expect(result).not.toContain('\f')
      expect(result).not.toContain('\v')
      expect(result).toContain('Before')
      expect(result).toContain('After')
    })

    it('removes page number artifacts', () => {
      const result = normalizeText('Content\nPage 1 of 3\nMore content')
      expect(result).not.toMatch(/Page \d+ of \d+/)
    })
  })

  describe('whitespace normalization', () => {
    it('collapses multiple spaces into one', () => {
      const result = normalizeText('Hello    world   test')
      expect(result).toBe('Hello world test')
    })

    it('preserves single spaces', () => {
      const result = normalizeText('Hello world')
      expect(result).toBe('Hello world')
    })
  })

  describe('line break standardization', () => {
    it('converts \\r\\n to \\n', () => {
      const result = normalizeText('Line 1\r\nLine 2')
      expect(result).toBe('Line 1\nLine 2')
      expect(result).not.toContain('\r')
    })

    it('converts standalone \\r to \\n', () => {
      const result = normalizeText('Line 1\rLine 2')
      expect(result).toBe('Line 1\nLine 2')
    })

    it('collapses 3+ newlines into double newline', () => {
      const result = normalizeText('Para 1\n\n\n\nPara 2')
      expect(result).toBe('Para 1\n\nPara 2')
    })

    it('preserves double newlines (paragraph breaks)', () => {
      const result = normalizeText('Para 1\n\nPara 2')
      expect(result).toBe('Para 1\n\nPara 2')
    })
  })

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(normalizeText('')).toBe('')
    })

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeText('   \n  \n  ')).toBe('')
    })

    it('passes through already-clean text unchanged', () => {
      const clean = 'This is perfectly clean text.\nWith two lines.'
      expect(normalizeText(clean)).toBe(clean)
    })

    it('trims leading and trailing whitespace', () => {
      const result = normalizeText('  Hello world  ')
      expect(result).toBe('Hello world')
    })

    it('trims each line individually', () => {
      const result = normalizeText('  Line 1  \n  Line 2  ')
      expect(result).toBe('Line 1\nLine 2')
    })
  })
})
