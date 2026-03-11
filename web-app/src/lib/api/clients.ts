/**
 * Client API functions
 */

import { Client, CreateClientInput, UpdateClientInput } from '@/lib/types/client'

export async function getClients(): Promise<Client[]> {
  const res = await fetch('/api/clients')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch clients')
  }
  return res.json()
}

export async function getClient(id: string): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch client')
  }
  return res.json()
}

export async function createClient(data: CreateClientInput): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create client')
  }
  return res.json()
}

export async function updateClient(id: string, data: UpdateClientInput): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update client')
  }
  return res.json()
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete client')
  }
}
