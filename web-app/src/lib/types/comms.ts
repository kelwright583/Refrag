/**
 * Communications types
 */

export type CommsChannel = 'email' | 'note'

export interface CommsTemplate {
  id: string
  org_id: string
  name: string
  subject_template: string
  body_template_md: string
  created_at: string
  updated_at: string
}

export interface CommsLogEntry {
  id: string
  org_id: string
  case_id: string
  sent_by: string
  channel: CommsChannel
  to_recipients: string | null
  subject: string | null
  body_md: string
  created_at: string
  updated_at: string
}

export interface CommsLogEntryWithUser extends CommsLogEntry {
  sent_by_user?: {
    id: string
    email: string
  }
}

export interface CreateCommsTemplateInput {
  name: string
  subject_template: string
  body_template_md: string
}

export interface UpdateCommsTemplateInput {
  name?: string
  subject_template?: string
  body_template_md?: string
}

export interface CreateCommsLogInput {
  case_id: string
  channel: CommsChannel
  to_recipients?: string
  subject?: string
  body_md: string
}

export interface TemplatePlaceholders {
  CaseNumber: string
  ClientName: string
  InsurerName: string
  BrokerName: string
  ClaimReference: string
  LossDate: string
  Location: string
}
