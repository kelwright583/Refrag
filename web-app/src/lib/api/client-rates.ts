import { ClientRate, CreateClientRateInput, UpdateClientRateInput } from '@/lib/types/client-rate'

export async function getClientRates(clientId: string): Promise<ClientRate[]> {
  const res = await fetch(`/api/clients/${clientId}/rates`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch client rates')
  }
  return res.json()
}

export async function createClientRate(clientId: string, input: CreateClientRateInput): Promise<ClientRate> {
  const res = await fetch(`/api/clients/${clientId}/rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create rate')
  }
  return res.json()
}

export async function updateClientRate(clientId: string, rateId: string, input: UpdateClientRateInput): Promise<ClientRate> {
  const res = await fetch(`/api/clients/${clientId}/rates/${rateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update rate')
  }
  return res.json()
}

export async function deleteClientRate(clientId: string, rateId: string): Promise<void> {
  const res = await fetch(`/api/clients/${clientId}/rates/${rateId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete rate')
  }
}
