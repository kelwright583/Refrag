import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFromData: Record<string, any> = {}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      const data = mockFromData[table]
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({ data: data?.list ?? [] }),
              }),
            }),
            single: vi.fn().mockReturnValue({ data: data?.single ?? null }),
          }),
        }),
      }
    },
  }),
}))

vi.mock('@/lib/events', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('./resolve-placeholders', () => ({
  resolvePlaceholders: (template: string, _ctx: any) =>
    template.replace(/\{\{(\w+)\}\}/g, (_m: string, token: string) => `[${token}]`),
}))

import { checkCommsTrigger, TRIGGER_EVENT_LABELS } from './trigger'

describe('checkCommsTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockFromData).forEach((k) => delete mockFromData[k])
  })

  it('returns shouldPrompt true when matching template found', async () => {
    mockFromData['comms_templates'] = {
      list: [
        {
          id: 'tpl-1',
          name: 'Quote Received',
          trigger_event: 'document_drop_repairer_quote',
          is_active: true,
          subject_template: 'Quote for {{CaseNumber}}',
          body_template_md: 'Dear {{InsurerName}}, quote received.',
          recipient_type: 'insurer',
        },
      ],
    }
    mockFromData['cases'] = {
      single: {
        case_number: 'CS-001',
        client_name: 'Test Client',
        insurer_name: 'Test Insurer',
        broker_name: 'Test Broker',
        claim_reference: 'CLM-001',
        loss_date: '2025-01-01',
        location: 'Johannesburg',
        client_id: 'client-1',
        vertical: 'motor_assessor',
      },
    }
    mockFromData['case_contacts'] = {
      list: [
        { name: 'Insurer Contact', email: 'insurer@test.com', role: 'insurer', party_type: 'insurer' },
      ],
    }

    const result = await checkCommsTrigger('document_drop_repairer_quote', 'case-1', 'org-1')

    expect(result.shouldPrompt).toBe(true)
    expect(result.templateName).toBe('Quote Received')
    expect(result.templateId).toBe('tpl-1')
    expect(result.triggerEvent).toBe('document_drop_repairer_quote')
  })

  it('returns shouldPrompt false when no matching template', async () => {
    mockFromData['comms_templates'] = { list: [] }

    const result = await checkCommsTrigger('document_drop_repairer_quote', 'case-1', 'org-1')

    expect(result.shouldPrompt).toBe(false)
    expect(result.templateName).toBeUndefined()
    expect(result.triggerEvent).toBe('document_drop_repairer_quote')
  })

  it('resolves placeholders in preview subject and body', async () => {
    mockFromData['comms_templates'] = {
      list: [
        {
          id: 'tpl-2',
          name: 'Status Update',
          subject_template: 'Update for {{CaseNumber}}',
          body_template_md: 'Hello {{ClientName}}',
          recipient_type: 'manual',
        },
      ],
    }
    mockFromData['cases'] = { single: { case_number: 'CS-999' } }
    mockFromData['case_contacts'] = { list: [] }

    const result = await checkCommsTrigger('status_change_reporting', 'case-1', 'org-1')

    expect(result.shouldPrompt).toBe(true)
    expect(result.previewSubject).toBe('Update for [CaseNumber]')
    expect(result.previewBody).toBe('Hello [ClientName]')
  })

  it('uses template name when subject_template is missing', async () => {
    mockFromData['comms_templates'] = {
      list: [
        {
          id: 'tpl-3',
          name: 'No Subject Template',
          subject_template: null,
          body_template_md: 'Body text',
          recipient_type: 'manual',
        },
      ],
    }
    mockFromData['cases'] = { single: null }
    mockFromData['case_contacts'] = { list: [] }

    const result = await checkCommsTrigger('invoice_issued', 'case-1', 'org-1')

    expect(result.previewSubject).toBe('No Subject Template')
  })

  it('returns suggestedRecipient as undefined for manual recipient type', async () => {
    mockFromData['comms_templates'] = {
      list: [
        {
          id: 'tpl-4',
          name: 'Manual',
          subject_template: 'Test',
          body_template_md: '',
          recipient_type: 'manual',
        },
      ],
    }
    mockFromData['cases'] = { single: null }
    mockFromData['case_contacts'] = { list: [] }

    const result = await checkCommsTrigger('report_pack_ready', 'case-1', 'org-1')

    expect(result.suggestedRecipient).toBeUndefined()
  })

  describe('different trigger events', () => {
    it('TRIGGER_EVENT_LABELS contains all known events', () => {
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('document_drop_repairer_quote')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('document_drop_instruction')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('status_change_on_site')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('status_change_reporting')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('status_change_submitted')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('mandate_missing_items')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('invoice_issued')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('report_pack_ready')
      expect(TRIGGER_EVENT_LABELS).toHaveProperty('appointment_scheduled')
    })

    it('all trigger event labels are non-empty strings', () => {
      for (const [key, label] of Object.entries(TRIGGER_EVENT_LABELS)) {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      }
    })
  })
})
