import {
  Mandate,
  MandateRequirement,
  CreateMandateInput,
  UpdateMandateInput,
  CreateRequirementInput,
  UpdateRequirementInput,
} from '@/lib/types/mandate'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function getMandates(): Promise<Mandate[]> {
  const res = await fetch('/api/mandates')
  return handleResponse<Mandate[]>(res)
}

export async function getMandate(id: string): Promise<Mandate & { requirements: MandateRequirement[] }> {
  const res = await fetch(`/api/mandates/${id}`)
  return handleResponse(res)
}

export async function createMandate(data: CreateMandateInput): Promise<Mandate> {
  const res = await fetch('/api/mandates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<Mandate>(res)
}

export async function updateMandate(id: string, data: UpdateMandateInput): Promise<Mandate> {
  const res = await fetch(`/api/mandates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<Mandate>(res)
}

export async function deleteMandate(id: string): Promise<void> {
  const res = await fetch(`/api/mandates/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete mandate')
  }
}

export async function cloneMandate(id: string, targetClientId?: string | null): Promise<Mandate> {
  const res = await fetch(`/api/mandates/${id}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_client_id: targetClientId }),
  })
  return handleResponse<Mandate>(res)
}

export async function getRequirements(mandateId: string): Promise<MandateRequirement[]> {
  const res = await fetch(`/api/mandates/${mandateId}/requirements`)
  return handleResponse<MandateRequirement[]>(res)
}

export async function createRequirement(
  mandateId: string,
  data: CreateRequirementInput
): Promise<MandateRequirement> {
  const res = await fetch(`/api/mandates/${mandateId}/requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<MandateRequirement>(res)
}

export async function bulkUpdateRequirements(
  mandateId: string,
  requirements: { id: string; order_index: number; category?: string }[]
): Promise<MandateRequirement[]> {
  const res = await fetch(`/api/mandates/${mandateId}/requirements`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements }),
  })
  return handleResponse<MandateRequirement[]>(res)
}

export async function updateRequirement(
  mandateId: string,
  requirementId: string,
  data: UpdateRequirementInput
): Promise<MandateRequirement> {
  const res = await fetch(`/api/mandates/${mandateId}/requirements/${requirementId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse<MandateRequirement>(res)
}

export async function deleteRequirement(mandateId: string, requirementId: string): Promise<void> {
  const res = await fetch(`/api/mandates/${mandateId}/requirements/${requirementId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete requirement')
  }
}
