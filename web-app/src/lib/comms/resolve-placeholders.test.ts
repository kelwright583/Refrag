import { describe, it, expect } from 'vitest'
import { resolvePlaceholders, type PlaceholderContext } from './resolve-placeholders'

const fullContext: PlaceholderContext = {
  case: {
    case_number: 'CS-2025-001',
    client_name: 'Acme Insurance',
    claim_reference: 'CLM-12345',
    insurer_name: 'ABC Insure',
    broker_name: 'Smith Brokers',
    loss_date: '2025-01-15',
    location: 'Cape Town',
  },
  assessment: {
    outcome: 'Repairable',
    claim_number: 'CLM-12345',
    insurer_name: 'ABC Insure',
    date_assessed: '2025-01-20',
    assessor_name: 'John Doe',
    insured_name: 'Jane Smith',
    policy_number: 'POL-98765',
  },
  vehicle: {
    make: 'Toyota',
    model: 'Corolla',
    year_model: 2022,
    reg_number: 'CA 123-456',
  },
  financials: {
    total_excl_vat: 45000,
    grand_total: 51750,
  },
}

describe('resolvePlaceholders', () => {
  it('replaces all known placeholders with values', () => {
    const template = 'Case {{CaseNumber}} for {{ClientName}}'
    expect(resolvePlaceholders(template, fullContext)).toBe('Case CS-2025-001 for Acme Insurance')
  })

  it('replaces case-related placeholders', () => {
    expect(resolvePlaceholders('Ref: {{ClaimReference}}', fullContext)).toBe('Ref: CLM-12345')
    expect(resolvePlaceholders('Broker: {{BrokerName}}', fullContext)).toBe('Broker: Smith Brokers')
    expect(resolvePlaceholders('Loss: {{LossDate}}', fullContext)).toBe('Loss: 2025-01-15')
    expect(resolvePlaceholders('Loc: {{Location}}', fullContext)).toBe('Loc: Cape Town')
  })

  it('replaces assessment-related placeholders', () => {
    expect(resolvePlaceholders('{{Outcome}}', fullContext)).toBe('Repairable')
    expect(resolvePlaceholders('{{ClaimNumber}}', fullContext)).toBe('CLM-12345')
    expect(resolvePlaceholders('{{DateAssessed}}', fullContext)).toBe('2025-01-20')
    expect(resolvePlaceholders('{{AssessorName}}', fullContext)).toBe('John Doe')
    expect(resolvePlaceholders('{{InsuredName}}', fullContext)).toBe('Jane Smith')
    expect(resolvePlaceholders('{{PolicyNumber}}', fullContext)).toBe('POL-98765')
  })

  it('resolves InsurerName from assessment first, falls back to case', () => {
    expect(resolvePlaceholders('{{InsurerName}}', fullContext)).toBe('ABC Insure')

    const caseOnlyCtx: PlaceholderContext = {
      case: { insurer_name: 'Fallback Insurer' },
    }
    expect(resolvePlaceholders('{{InsurerName}}', caseOnlyCtx)).toBe('Fallback Insurer')
  })

  it('composes VehicleDetails from vehicle fields', () => {
    const result = resolvePlaceholders('Vehicle: {{VehicleDetails}}', fullContext)
    expect(result).toBe('Vehicle: 2022 Toyota Corolla CA 123-456')
  })

  it('handles partial vehicle details', () => {
    const ctx: PlaceholderContext = {
      vehicle: { make: 'BMW', model: 'X5' },
    }
    expect(resolvePlaceholders('{{VehicleDetails}}', ctx)).toBe('BMW X5')
  })

  it('formats financial values as South African Rand currency', () => {
    const repairResult = resolvePlaceholders('Repair: {{RepairTotal}}', fullContext)
    expect(repairResult).toContain('R')
    expect(repairResult).toContain('45')

    const grandResult = resolvePlaceholders('Grand: {{GrandTotal}}', fullContext)
    expect(grandResult).toContain('R')
    expect(grandResult).toContain('51')
  })

  it('replaces missing values with N/A', () => {
    const emptyCtx: PlaceholderContext = {}
    expect(resolvePlaceholders('Case: {{CaseNumber}}', emptyCtx)).toBe('Case: N/A')
    expect(resolvePlaceholders('{{VehicleDetails}}', emptyCtx)).toBe('N/A')
    expect(resolvePlaceholders('{{RepairTotal}}', emptyCtx)).toBe('N/A')
  })

  it('replaces unknown placeholders with N/A', () => {
    expect(resolvePlaceholders('{{SomethingRandom}}', fullContext)).toBe('N/A')
  })

  it('leaves non-placeholder text unchanged', () => {
    const template = 'Hello world, no placeholders here.'
    expect(resolvePlaceholders(template, fullContext)).toBe(template)
  })

  it('handles multiple placeholders in one template', () => {
    const template = 'Dear {{InsuredName}}, your case {{CaseNumber}} has been assessed by {{AssessorName}}.'
    const result = resolvePlaceholders(template, fullContext)
    expect(result).toBe('Dear Jane Smith, your case CS-2025-001 has been assessed by John Doe.')
  })

  it('handles template with no context at all', () => {
    const template = '{{CaseNumber}} - {{InsuredName}} - {{VehicleDetails}}'
    const result = resolvePlaceholders(template, {})
    expect(result).toBe('N/A - N/A - N/A')
  })
})
