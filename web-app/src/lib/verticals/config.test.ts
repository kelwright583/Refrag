import { describe, it, expect } from 'vitest'
import {
  VERTICAL_CONFIGS,
  VERTICAL_IDS,
  type VerticalId,
  type SectionKey,
  type VerticalConfig,
} from './config'
import { getVerticalConfig } from './index'

const ALL_VALID_SECTION_KEYS: SectionKey[] = [
  'instruction_details', 'vehicle_summary', 'property_summary', 'referral_details',
  'parties_summary', 'contacts', 'mandate_progress', 'case_notes', 'timeline',
  'evidence_grid', 'valuation_drop', 'repairer_quote_drop', 'parts_quote_drop',
  'contractor_quote_drop', 'contents_list_drop', 'statement_upload', 'document_log',
  'mandate_checklist',
  'damage_labour', 'parts_assessment', 'tyre_grid', 'vehicle_values',
  'property_damage_sections', 'contractor_quotes', 'reinstatement_values',
  'contents_inventory', 'quantum_reconciliation', 'findings_list',
  'investigation_timeline', 'parties_statements', 'red_flags', 'time_disbursements',
  'report_builder', 'outcome_financials', 'report_preview',
  'pack_builder', 'invoice_builder',
]

describe('VERTICAL_CONFIGS', () => {
  it('contains exactly 5 verticals', () => {
    expect(VERTICAL_IDS.length).toBe(5)
  })

  it('contains all expected vertical IDs', () => {
    expect(VERTICAL_IDS).toContain('motor_assessor')
    expect(VERTICAL_IDS).toContain('property_assessor')
    expect(VERTICAL_IDS).toContain('loss_adjuster')
    expect(VERTICAL_IDS).toContain('investigator')
    expect(VERTICAL_IDS).toContain('general')
  })

  describe.each(VERTICAL_IDS)('vertical: %s', (verticalId) => {
    const config = VERTICAL_CONFIGS[verticalId]

    it('has a complete config object', () => {
      expect(config).toBeDefined()
      expect(config.id).toBe(verticalId)
      expect(typeof config.label).toBe('string')
      expect(config.label.length).toBeGreaterThan(0)
      expect(typeof config.description).toBe('string')
      expect(config.description.length).toBeGreaterThan(0)
      expect(typeof config.icon).toBe('string')
      expect(config.icon.length).toBeGreaterThan(0)
    })

    it('has all terminology fields populated', () => {
      const { terminology } = config
      expect(typeof terminology.riskItem).toBe('string')
      expect(terminology.riskItem.length).toBeGreaterThan(0)
      expect(typeof terminology.riskItemPlural).toBe('string')
      expect(terminology.riskItemPlural.length).toBeGreaterThan(0)
      expect(typeof terminology.identifier).toBe('string')
      expect(terminology.identifier.length).toBeGreaterThan(0)
      expect(typeof terminology.financialSummary).toBe('string')
      expect(terminology.financialSummary.length).toBeGreaterThan(0)
      expect(typeof terminology.outcome).toBe('string')
      expect(terminology.outcome.length).toBeGreaterThan(0)
      expect(typeof terminology.instructingParty).toBe('string')
      expect(terminology.instructingParty.length).toBeGreaterThan(0)
      expect(typeof terminology.assessmentVerb).toBe('string')
      expect(terminology.assessmentVerb.length).toBeGreaterThan(0)
    })

    it('has all section categories populated', () => {
      expect(Array.isArray(config.sections.overview)).toBe(true)
      expect(config.sections.overview.length).toBeGreaterThan(0)
      expect(Array.isArray(config.sections.capture)).toBe(true)
      expect(config.sections.capture.length).toBeGreaterThan(0)
      expect(Array.isArray(config.sections.assessment)).toBe(true)
      expect(config.sections.assessment.length).toBeGreaterThan(0)
      expect(Array.isArray(config.sections.report)).toBe(true)
      expect(config.sections.report.length).toBeGreaterThan(0)
      expect(Array.isArray(config.sections.pack)).toBe(true)
      expect(config.sections.pack.length).toBeGreaterThan(0)
    })

    it('uses only valid section keys', () => {
      const allKeys = [
        ...config.sections.overview,
        ...config.sections.capture,
        ...config.sections.assessment,
        ...config.sections.report,
        ...config.sections.pack,
      ]
      for (const key of allKeys) {
        expect(ALL_VALID_SECTION_KEYS).toContain(key)
      }
    })

    it('has report sections defined', () => {
      expect(Array.isArray(config.reportSections)).toBe(true)
      expect(config.reportSections.length).toBeGreaterThan(0)
    })

    it('report sections have valid structure', () => {
      for (const section of config.reportSections) {
        expect(typeof section.key).toBe('string')
        expect(section.key.length).toBeGreaterThan(0)
        expect(typeof section.heading).toBe('string')
        expect(section.heading.length).toBeGreaterThan(0)
        expect(typeof section.description).toBe('string')
        expect(typeof section.isRequired).toBe('boolean')
        expect(typeof section.aiDraftAvailable).toBe('boolean')
      }
    })

    it('has a valid financial module', () => {
      const validModules = ['motor_repair', 'property_reinstatement', 'loss_adjuster', 'time_disbursement', 'none']
      expect(validModules).toContain(config.financialModule)
    })

    it('has default mandate keys', () => {
      expect(Array.isArray(config.defaultMandateKeys)).toBe(true)
      expect(config.defaultMandateKeys.length).toBeGreaterThan(0)
    })

    it('has default outcomes', () => {
      expect(Array.isArray(config.defaultOutcomes)).toBe(true)
      expect(config.defaultOutcomes.length).toBeGreaterThan(0)
    })

    it('has risk types', () => {
      expect(Array.isArray(config.riskTypes)).toBe(true)
      expect(config.riskTypes.length).toBeGreaterThan(0)
    })
  })
})

describe('getVerticalConfig', () => {
  it('returns correct config for motor_assessor', () => {
    const config = getVerticalConfig('motor_assessor')
    expect(config.id).toBe('motor_assessor')
    expect(config.label).toBe('Motor Assessor')
  })

  it('returns correct config for property_assessor', () => {
    const config = getVerticalConfig('property_assessor')
    expect(config.id).toBe('property_assessor')
  })

  it('returns correct config for loss_adjuster', () => {
    const config = getVerticalConfig('loss_adjuster')
    expect(config.id).toBe('loss_adjuster')
  })

  it('returns correct config for investigator', () => {
    const config = getVerticalConfig('investigator')
    expect(config.id).toBe('investigator')
  })

  it('returns correct config for general', () => {
    const config = getVerticalConfig('general')
    expect(config.id).toBe('general')
  })

  it('falls back to general for unknown vertical ID', () => {
    const config = getVerticalConfig('nonexistent_vertical')
    expect(config.id).toBe('general')
    expect(config.label).toBe('General')
  })

  it('falls back to general for empty string', () => {
    const config = getVerticalConfig('')
    expect(config.id).toBe('general')
  })
})
