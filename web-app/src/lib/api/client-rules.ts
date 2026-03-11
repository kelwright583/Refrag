/**
 * Client rules API functions (client-side)
 */

import { ClientRule, CreateClientRuleInput, UpdateClientRuleInput } from '@/lib/types/client-rule'

export async function getClientRules(clientId: string): Promise<ClientRule[]> {
  const res = await fetch(`/api/clients/${clientId}/rules`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch client rules')
  }
  return res.json()
}

export async function upsertClientRule(input: CreateClientRuleInput): Promise<ClientRule> {
  const res = await fetch(`/api/clients/${input.client_id}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to save client rule')
  }
  return res.json()
}

export async function deleteClientRule(clientId: string, ruleKey: string): Promise<void> {
  const res = await fetch(`/api/clients/${clientId}/rules/${encodeURIComponent(ruleKey)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete client rule')
  }
}
