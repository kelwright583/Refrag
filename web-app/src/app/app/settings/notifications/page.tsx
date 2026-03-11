/**
 * Notification settings — configure email rules per status transition
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNotificationRules, useUpsertNotificationRule } from '@/hooks/use-notification-rules'
import { useCommsTemplates } from '@/hooks/use-comms'
import { NotificationRule, RecipientType } from '@/lib/types/notification-rule'
import { CaseStatus } from '@/lib/types/case'

const STATUS_OPTIONS: CaseStatus[] = [
  'draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed',
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  site_visit: 'Site Visit',
  awaiting_quote: 'Awaiting Quote',
  reporting: 'Reporting',
  submitted: 'Submitted',
  additional: 'Additional',
  closed: 'Closed',
}

const RECIPIENT_OPTIONS: { value: RecipientType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'broker', label: 'Broker' },
  { value: 'insurer', label: 'Insurer' },
  { value: 'panelbeater', label: 'Panelbeater' },
]

/**
 * Suggested transitions
 */
const SUGGESTED_TRANSITIONS: { from: CaseStatus | null; to: CaseStatus; label: string }[] = [
  { from: 'draft', to: 'assigned', label: 'Draft → Assigned' },
  { from: 'assigned', to: 'site_visit', label: 'Assigned → Site Visit' },
  { from: 'site_visit', to: 'awaiting_quote', label: 'Site Visit → Awaiting Quote' },
  { from: 'awaiting_quote', to: 'reporting', label: 'Awaiting Quote → Reporting' },
  { from: 'reporting', to: 'submitted', label: 'Reporting → Submitted' },
  { from: 'submitted', to: 'additional', label: 'Submitted → Additional' },
  { from: null, to: 'closed', label: 'Any → Closed' },
]

export default function NotificationSettingsPage() {
  const { data: rules, isLoading } = useNotificationRules()
  const { data: templates } = useCommsTemplates()
  const upsertRule = useUpsertNotificationRule()
  const [saving, setSaving] = useState<string | null>(null)

  const getRuleForTransition = (from: string | null, to: string): NotificationRule | undefined => {
    return rules?.find((r) =>
      r.from_status === from && r.to_status === to
    )
  }

  const handleToggle = async (from: string | null, to: string, field: 'is_enabled' | 'auto_send', value: boolean) => {
    const existing = getRuleForTransition(from, to)
    const key = `${from || 'any'}->${to}`
    setSaving(key)
    try {
      await upsertRule.mutateAsync({
        from_status: from,
        to_status: to,
        is_enabled: field === 'is_enabled' ? value : (existing?.is_enabled ?? false),
        auto_send: field === 'auto_send' ? value : (existing?.auto_send ?? false),
        template_id: existing?.template_id || null,
        default_recipients: existing?.default_recipients || ['client', 'broker'],
      })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleTemplateChange = async (from: string | null, to: string, templateId: string) => {
    const existing = getRuleForTransition(from, to)
    const key = `${from || 'any'}->${to}`
    setSaving(key)
    try {
      await upsertRule.mutateAsync({
        from_status: from,
        to_status: to,
        is_enabled: existing?.is_enabled ?? true,
        auto_send: existing?.auto_send ?? false,
        template_id: templateId || null,
        default_recipients: existing?.default_recipients || ['client', 'broker'],
      })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleRecipientToggle = async (from: string | null, to: string, recipient: RecipientType) => {
    const existing = getRuleForTransition(from, to)
    const current = existing?.default_recipients || ['client', 'broker']
    const updated = current.includes(recipient)
      ? current.filter((r) => r !== recipient)
      : [...current, recipient]
    const key = `${from || 'any'}->${to}`
    setSaving(key)
    try {
      await upsertRule.mutateAsync({
        from_status: from,
        to_status: to,
        is_enabled: existing?.is_enabled ?? true,
        auto_send: existing?.auto_send ?? false,
        template_id: existing?.template_id || null,
        default_recipients: updated,
      })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/app/settings" className="text-sm text-muted hover:text-slate mb-6 inline-block">
        Back to Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Notification Rules</h1>
        <p className="text-slate mt-1">
          Configure which status changes trigger email notifications and who receives them.
          Use &quot;Prompt&quot; mode to review before sending, or &quot;Auto-send&quot; for hands-free.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {SUGGESTED_TRANSITIONS.map((transition) => {
            const rule = getRuleForTransition(transition.from, transition.to)
            const key = `${transition.from || 'any'}->${transition.to}`
            const isSaving = saving === key
            const isEnabled = rule?.is_enabled ?? false
            const isAutoSend = rule?.auto_send ?? false
            const recipients = rule?.default_recipients || []

            return (
              <div key={key} className={`border rounded-lg p-5 transition-all ${isEnabled ? 'border-accent bg-white' : 'border-[#D4CFC7] bg-[#FAFAF8]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(transition.from, transition.to, 'is_enabled', !isEnabled)}
                      disabled={isSaving}
                      className={`w-10 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-accent' : 'bg-[#D4CFC7]'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="font-medium text-charcoal">{transition.label}</span>
                    {isSaving && <span className="text-xs text-muted animate-pulse">Saving...</span>}
                  </div>

                  {isEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Mode:</span>
                      <button
                        onClick={() => handleToggle(transition.from, transition.to, 'auto_send', !isAutoSend)}
                        disabled={isSaving}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                          isAutoSend
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAutoSend ? 'Auto-send' : 'Prompt'}
                      </button>
                    </div>
                  )}
                </div>

                {isEnabled && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Email Template</label>
                      <select
                        value={rule?.template_id || ''}
                        onChange={(e) => handleTemplateChange(transition.from, transition.to, e.target.value)}
                        disabled={isSaving}
                        className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                      >
                        <option value="">No template</option>
                        {templates?.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Default Recipients</label>
                      <div className="flex flex-wrap gap-2">
                        {RECIPIENT_OPTIONS.map((opt) => {
                          const active = recipients.includes(opt.value)
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleRecipientToggle(transition.from, transition.to, opt.value)}
                              disabled={isSaving}
                              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                                active
                                  ? 'bg-accent/10 text-accent border border-accent/30'
                                  : 'bg-gray-100 text-muted border border-transparent'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
