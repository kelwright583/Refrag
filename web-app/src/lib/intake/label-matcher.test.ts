import { describe, it, expect } from 'vitest'
import { matchLabels, type MatchedField } from './label-matcher'
import type { FieldSchema } from './extraction-schemas'
import { EXTRACTION_SCHEMAS, getPiiFields } from './extraction-schemas'

const makeSchema = (keys: string[]): FieldSchema[] =>
  keys.map((key) => ({ key, label: key, type: 'text' as const }))

describe('matchLabels', () => {
  describe('exact label match (high confidence)', () => {
    it('matches "Policy No: 12345" with high confidence', () => {
      const text = 'Policy No: POL-98765'
      const schema = makeSchema(['policy_number'])
      const result = matchLabels(text, schema)
      expect(result.policy_number).toBeDefined()
      expect(result.policy_number.value).toBe('POL-98765')
      expect(result.policy_number.confidence).toBe('high')
    })

    it('matches label at the start of a line', () => {
      const text = 'Claim Ref: CLM-001\nOther stuff'
      const schema = makeSchema(['insurer_reference'])
      const result = matchLabels(text, schema)
      expect(result.insurer_reference).toBeDefined()
      expect(result.insurer_reference.value).toBe('CLM-001')
      expect(result.insurer_reference.confidence).toBe('high')
    })

    it('matches label with period-colon delimiter', () => {
      const text = 'Policy No.: ABC123'
      const schema = makeSchema(['policy_number'])
      const result = matchLabels(text, schema)
      expect(result.policy_number).toBeDefined()
      expect(result.policy_number.value).toBe('ABC123')
    })
  })

  describe('fuzzy match (medium confidence)', () => {
    it('matches label mid-line with medium confidence', () => {
      const text = 'Some prefix text policy number XYZ-789 and more'
      const schema = makeSchema(['policy_number'])
      const result = matchLabels(text, schema)
      expect(result.policy_number).toBeDefined()
      expect(result.policy_number.confidence).toBe('medium')
    })
  })

  describe('value extraction after labels', () => {
    it('extracts value after colon separator', () => {
      const text = 'Insurer: ABC Insurance Ltd'
      const schema = makeSchema(['insurer_name'])
      const result = matchLabels(text, schema)
      expect(result.insurer_name.value).toBe('ABC Insurance Ltd')
    })

    it('extracts value after space separator', () => {
      const text = 'Make  Toyota'
      const schema = makeSchema(['vehicle_make'])
      const result = matchLabels(text, schema)
      expect(result.vehicle_make).toBeDefined()
      expect(result.vehicle_make.value).toContain('Toyota')
    })

    it('extracts value after dash separator', () => {
      const text = 'VIN - WBADE6322VGE12345'
      const schema = makeSchema(['vin'])
      const result = matchLabels(text, schema)
      expect(result.vin).toBeDefined()
      expect(result.vin.value).toContain('WBADE6322VGE12345')
    })
  })

  describe('multi-line text', () => {
    it('extracts multiple fields from multi-line document', () => {
      const text = [
        'Claim Ref: CLM-12345',
        'Policy No: POL-98765',
        'Date of Loss: 2025-01-15',
        'Insured: John Smith',
        'Vehicle Registration: CA 123-456',
      ].join('\n')

      const schema = makeSchema([
        'insurer_reference',
        'policy_number',
        'loss_date',
        'insured_name',
        'vehicle_registration',
      ])

      const result = matchLabels(text, schema)
      expect(Object.keys(result).length).toBe(5)
      expect(result.insurer_reference.value).toBe('CLM-12345')
      expect(result.policy_number.value).toBe('POL-98765')
      expect(result.loss_date.value).toBe('2025-01-15')
      expect(result.insured_name.value).toBe('John Smith')
      expect(result.vehicle_registration.value).toContain('CA 123-456')
    })
  })

  describe('no matching labels', () => {
    it('returns empty object when no labels match', () => {
      const text = 'This text has no recognizable labels whatsoever.'
      const schema = makeSchema(['policy_number', 'vin'])
      const result = matchLabels(text, schema)
      expect(Object.keys(result).length).toBe(0)
    })

    it('returns empty object for empty text', () => {
      const schema = makeSchema(['policy_number'])
      const result = matchLabels('', schema)
      expect(Object.keys(result).length).toBe(0)
    })

    it('returns empty object for empty schema', () => {
      const text = 'Policy No: 12345'
      const result = matchLabels(text, [])
      expect(Object.keys(result).length).toBe(0)
    })
  })

  describe('PII fields identification', () => {
    it('instruction schema contains PII fields for insured_name, contact_phone, contact_email', () => {
      const piiFields = getPiiFields(EXTRACTION_SCHEMAS.instruction)
      const piiKeys = piiFields.map((f) => f.key)
      expect(piiKeys).toContain('insured_name')
      expect(piiKeys).toContain('contact_phone')
      expect(piiKeys).toContain('contact_email')
    })

    it('statement schema contains PII fields for deponent_name, deponent_id, witness_name', () => {
      const piiFields = getPiiFields(EXTRACTION_SCHEMAS.statement)
      const piiKeys = piiFields.map((f) => f.key)
      expect(piiKeys).toContain('deponent_name')
      expect(piiKeys).toContain('deponent_id')
      expect(piiKeys).toContain('witness_name')
    })

    it('valuation_printout schema has no PII fields', () => {
      const piiFields = getPiiFields(EXTRACTION_SCHEMAS.valuation_printout)
      expect(piiFields.length).toBe(0)
    })
  })

  describe('different document roles', () => {
    it('matches instruction fields from instruction text', () => {
      const text = 'Claim Ref: CLM-999\nInsurer: Big Insure'
      const result = matchLabels(text, EXTRACTION_SCHEMAS.instruction)
      expect(result.insurer_reference).toBeDefined()
      expect(result.insurer_name).toBeDefined()
    })

    it('matches valuation fields from valuation text', () => {
      const text = 'Retail Value: 250000\nTrade Value: 200000\nMM Code: 12345678'
      const result = matchLabels(text, EXTRACTION_SCHEMAS.valuation_printout)
      expect(result.retail_value).toBeDefined()
      expect(result.trade_value).toBeDefined()
      expect(result.mm_code).toBeDefined()
    })

    it('matches statement fields from statement text', () => {
      const text = 'Deponent: Jane Doe\nIdentity Number: 9001015009087\nStatement Date: 2025-03-01'
      const result = matchLabels(text, EXTRACTION_SCHEMAS.statement)
      expect(result.deponent_name).toBeDefined()
      expect(result.deponent_id).toBeDefined()
      expect(result.statement_date).toBeDefined()
    })
  })
})
