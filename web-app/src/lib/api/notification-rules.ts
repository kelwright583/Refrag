/**
 * Notification rules API functions (client-side)
 */

import { NotificationRule, UpsertNotificationRuleInput } from '@/lib/types/notification-rule'

export async function getNotificationRules(): Promise<NotificationRule[]> {
  const res = await fetch('/api/notification-rules')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch notification rules')
  }
  return res.json()
}

export async function upsertNotificationRule(input: UpsertNotificationRuleInput): Promise<NotificationRule> {
  const res = await fetch('/api/notification-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to save notification rule')
  }
  return res.json()
}

export async function deleteNotificationRule(ruleId: string): Promise<void> {
  const res = await fetch(`/api/notification-rules/${ruleId}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete notification rule')
  }
}

export async function sendCaseNotification(caseId: string, payload: {
  rule_id: string
  recipients: string[]
  recipient_types: string[]
  subject: string
  body: string
}): Promise<void> {
  const res = await fetch(`/api/cases/${caseId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to send notification')
  }
}
