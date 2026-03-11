/**
 * Admin types
 */

export type OrgStatus = 'active' | 'trial' | 'suspended' | 'closed'
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type StaffRole = 'super_admin' | 'admin' | 'support' | 'analyst'

export type OrgSpecialisation =
  | 'motor_assessor'
  | 'property_assessor'
  | 'loss_adjuster'
  | 'investigator'
  | 'general'

export const SPECIALISATION_LABELS: Record<OrgSpecialisation, string> = {
  motor_assessor: 'Motor Assessor',
  property_assessor: 'Property Assessor',
  loss_adjuster: 'Loss Adjuster',
  investigator: 'Investigator',
  general: 'General / All',
}

export interface Organisation {
  id: string
  name: string
  slug: string
  status: OrgStatus
  plan_name: string
  billing_status: BillingStatus
  billing_provider: string | null
  billing_customer_id: string | null
  subscription_started_at: string | null
  subscription_ends_at: string | null
  specialisations: OrgSpecialisation[]
  created_at: string
  updated_at: string
}

export interface OrganisationWithStats extends Organisation {
  member_count?: number
  case_count?: number
  evidence_count?: number
}

export interface UpdateOrganisationInput {
  status?: OrgStatus
  plan_name?: string
  billing_status?: BillingStatus
  billing_provider?: string
  billing_customer_id?: string
  subscription_started_at?: string
  subscription_ends_at?: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface OrgMemberWithUser extends OrgMember {
  user?: {
    id: string
    email: string
  }
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface UserWithOrgs extends User {
  orgs?: Array<{
    id: string
    name: string
    role: string
  }>
}

export interface UpdateUserInput {
  disabled?: boolean
}
