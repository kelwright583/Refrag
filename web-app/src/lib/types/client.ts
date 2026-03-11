/**
 * Client types
 */

export interface Client {
  id: string
  org_id: string
  name: string
  client_type: string | null
  contact_email: string | null
  contact_phone: string | null
  billing_email: string | null
  vat_number: string | null
  postal_address: string | null
  physical_address: string | null
  default_mandate_id: string | null
  default_report_template: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateClientInput {
  name: string
  client_type?: string
  contact_email?: string
  contact_phone?: string
  billing_email?: string
  vat_number?: string
  postal_address?: string
  physical_address?: string
  default_mandate_id?: string
  default_report_template?: string
  notes?: string
}

export type UpdateClientInput = Partial<CreateClientInput>
