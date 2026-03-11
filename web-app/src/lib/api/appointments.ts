/**
 * Appointments API - fetch from Next.js API routes
 */

export interface Appointment {
  id: string
  org_id: string
  case_id: string
  scheduled_at: string
  address: string | null
  notes: string | null
  assigned_to: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  case?: {
    id: string
    case_number: string
    client_name: string
  }
}

export interface CreateAppointmentInput {
  case_id: string
  scheduled_at: string
  address?: string
  notes?: string
  assigned_to?: string
}

export async function getAppointments(options?: {
  from?: string
  to?: string
  caseId?: string
}): Promise<Appointment[]> {
  const params = new URLSearchParams()
  if (options?.from) params.set('from', options.from)
  if (options?.to) params.set('to', options.to)
  if (options?.caseId) params.set('case_id', options.caseId)

  const res = await fetch(`/api/appointments?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch appointments')
  }
  return res.json()
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create appointment')
  }
  return res.json()
}

export interface UpdateAppointmentInput {
  scheduled_at?: string
  address?: string | null
  notes?: string | null
  completed_at?: string | null
  started_at?: string | null
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update appointment')
  }
  return res.json()
}

export async function deleteAppointment(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete appointment')
  }
}
