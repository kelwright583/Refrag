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
  default_mandate_id: string | null
  default_report_template: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
