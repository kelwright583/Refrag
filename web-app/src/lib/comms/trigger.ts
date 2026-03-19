import { createClient } from '@/lib/supabase/client'
import { resolvePlaceholders, PlaceholderContext } from './resolve-placeholders'
import { trackEvent } from '@/lib/events'

export interface CommsTriggerResult {
  shouldPrompt: boolean
  templateName?: string
  templateId?: string
  previewSubject?: string
  previewBody?: string
  suggestedRecipient?: { name: string; email: string }
  triggerEvent: string
}

export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  document_drop_repairer_quote: 'Quote received — send update to broker?',
  document_drop_instruction: 'Instruction received — send acknowledgement?',
  status_change_on_site: 'Site visit started — notify any parties?',
  status_change_reporting: 'Report in progress — send ETA to insurer?',
  status_change_submitted: 'Report submitted — notify broker and insurer?',
  mandate_missing_items: 'Missing required items — request info from insurer?',
  invoice_issued: 'Invoice created — send to client?',
  report_pack_ready: 'Pack ready — email to insurer?',
  appointment_scheduled: 'Appointment set — send confirmation?',
}

/**
 * Checks whether a given trigger event should prompt a comms action.
 * Looks up active comms_templates for the org matching the event,
 * resolves the template placeholders with live case data,
 * and determines a suggested recipient.
 */
export async function checkCommsTrigger(
  event: string,
  caseId: string,
  orgId: string
): Promise<CommsTriggerResult> {
  const supabase = createClient()

  const { data: templates } = await supabase
    .from('comms_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('trigger_event', event)
    .eq('is_active', true)
    .limit(1)

  if (!templates?.length) {
    return { shouldPrompt: false, triggerEvent: event }
  }

  const template = templates[0]

  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      case_number, client_name, insurer_name, broker_name,
      claim_reference, loss_date, location, client_id, vertical
    `)
    .eq('id', caseId)
    .single()

  const { data: contacts } = await supabase
    .from('case_contacts')
    .select('name, email, role, party_type')
    .eq('case_id', caseId)

  const ctx: PlaceholderContext = {
    case: {
      case_number: caseData?.case_number,
      client_name: caseData?.client_name,
      claim_reference: caseData?.claim_reference,
      insurer_name: caseData?.insurer_name,
      broker_name: caseData?.broker_name,
      loss_date: caseData?.loss_date,
      location: caseData?.location,
    },
  }

  const resolvedSubject = template.subject_template
    ? resolvePlaceholders(template.subject_template, ctx)
    : template.name

  const resolvedBody = template.body_template_md
    ? resolvePlaceholders(template.body_template_md, ctx)
    : ''

  const suggestedRecipient = resolveRecipient(
    template.recipient_type,
    caseData,
    contacts || []
  )

  trackEvent('comms_triggered', {
    trigger_event: event,
    case_id: caseId,
    template_name: template.name,
    should_prompt: true,
  })

  return {
    shouldPrompt: true,
    templateName: template.name,
    templateId: template.id,
    previewSubject: resolvedSubject,
    previewBody: resolvedBody,
    suggestedRecipient,
    triggerEvent: event,
  }
}

function resolveRecipient(
  recipientType: string | null,
  caseData: any,
  contacts: any[]
): { name: string; email: string } | undefined {
  if (!recipientType || recipientType === 'manual') return undefined

  if (recipientType === 'insurer') {
    const insurer = contacts.find(
      (c) => c.role === 'insurer' || c.party_type === 'insurer'
    )
    if (insurer?.email) return { name: insurer.name || 'Insurer', email: insurer.email }
    if (caseData?.insurer_name) return { name: caseData.insurer_name, email: '' }
  }

  if (recipientType === 'broker') {
    const broker = contacts.find(
      (c) => c.role === 'broker' || c.party_type === 'broker'
    )
    if (broker?.email) return { name: broker.name || 'Broker', email: broker.email }
    if (caseData?.broker_name) return { name: caseData.broker_name, email: '' }
  }

  if (recipientType === 'client') {
    const client = contacts.find(
      (c) => c.role === 'client' || c.party_type === 'client'
    )
    if (client?.email) return { name: client.name || 'Client', email: client.email }
    if (caseData?.client_name) return { name: caseData.client_name, email: '' }
  }

  if (recipientType === 'insured') {
    const insured = contacts.find(
      (c) => c.role === 'insured' || c.party_type === 'insured'
    )
    if (insured?.email) return { name: insured.name || 'Insured', email: insured.email }
  }

  const fallback = contacts.find((c) => c.email)
  if (fallback?.email) return { name: fallback.name || 'Contact', email: fallback.email }

  return undefined
}
