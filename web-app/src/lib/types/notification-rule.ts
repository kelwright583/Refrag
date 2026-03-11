/**
 * Notification rule types
 */

export type RecipientType = 'client' | 'broker' | 'insurer' | 'panelbeater'

export interface NotificationRule {
  id: string
  org_id: string
  from_status: string | null
  to_status: string
  is_enabled: boolean
  auto_send: boolean
  template_id: string | null
  default_recipients: RecipientType[]
  created_at: string
  updated_at: string
}

export interface UpsertNotificationRuleInput {
  from_status: string | null
  to_status: string
  is_enabled: boolean
  auto_send: boolean
  template_id: string | null
  default_recipients: RecipientType[]
}

/**
 * Returned from status change API when a notification rule matches
 */
export interface NotificationPrompt {
  rule_id: string
  from_status: string | null
  to_status: string
  auto_send: boolean
  template_id: string | null
  template_subject: string | null
  template_body: string | null
  default_recipients: RecipientType[]
}

/**
 * Input for the notify endpoint
 */
export interface SendNotificationInput {
  case_id: string
  rule_id: string
  recipients: string[]   // email addresses
  recipient_types: RecipientType[]
  subject: string
  body: string
}
