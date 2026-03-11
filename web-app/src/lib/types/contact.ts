/**
 * Contact types
 */

export type ContactType = 'insured' | 'broker' | 'insurer' | 'panelbeater' | 'other'

export interface CaseContact {
  id: string
  org_id: string
  case_id: string
  type: ContactType
  name: string
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactInput {
  case_id: string
  type: ContactType
  name: string
  email?: string
  phone?: string
}

export interface UpdateContactInput extends Partial<CreateContactInput> {}
