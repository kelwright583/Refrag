export type EvidenceType = 'photo' | 'video' | 'document' | 'text_note' | 'none'

export type RequirementCategory =
  | 'identity_documents'
  | 'scene_damage_photos'
  | 'third_party_documents'
  | 'internal_checks'
  | 'specialist_requirements'
  | 'custom'

export interface Mandate {
  id: string
  org_id: string
  name: string
  insurer_name: string | null
  description: string | null
  client_id: string | null
  vertical: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  client_name?: string
  requirement_count?: number
}

export interface MandateRequirement {
  id: string
  org_id: string
  mandate_id: string
  requirement_key: string
  key: string
  label: string
  description: string | null
  required: boolean
  is_required: boolean
  evidence_type: EvidenceType
  guidance_note: string | null
  category: RequirementCategory
  order_index: number
  created_at: string
  updated_at: string
}

export interface CreateMandateInput {
  name: string
  description?: string | null
  client_id?: string | null
  vertical?: string
  is_default?: boolean
  clone_from_id?: string | null
}

export interface UpdateMandateInput {
  name?: string
  description?: string | null
  client_id?: string | null
  vertical?: string
  is_default?: boolean
  is_active?: boolean
}

export interface CreateRequirementInput {
  label: string
  requirement_key?: string
  category?: RequirementCategory
  is_required?: boolean
  evidence_type?: EvidenceType
  guidance_note?: string | null
  order_index?: number
}

export interface UpdateRequirementInput {
  label?: string
  requirement_key?: string
  category?: RequirementCategory
  is_required?: boolean
  evidence_type?: EvidenceType
  guidance_note?: string | null
  order_index?: number
}

export const REQUIREMENT_CATEGORIES: { value: RequirementCategory; label: string; icon: string }[] = [
  { value: 'identity_documents', label: 'Identity Documents', icon: 'IdCard' },
  { value: 'scene_damage_photos', label: 'Scene / Damage Photos', icon: 'Camera' },
  { value: 'third_party_documents', label: 'Third-Party Documents', icon: 'FileText' },
  { value: 'internal_checks', label: 'Internal Checks', icon: 'ClipboardCheck' },
  { value: 'specialist_requirements', label: 'Specialist Requirements', icon: 'Shield' },
  { value: 'custom', label: 'Custom', icon: 'Settings' },
]

export const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'text_note', label: 'Text Note' },
  { value: 'none', label: 'None' },
]

export type RequirementStatus = 'missing' | 'provided' | 'not_applicable'

export interface CaseRequirementCheck {
  id: string
  org_id: string
  case_id: string
  mandate_id: string
  requirement_id: string
  status: RequirementStatus
  evidence_id: string | null
  evidence: { id: string; file_name: string; media_type: string } | null
  note: string | null
  created_at: string
  updated_at: string
  requirement: MandateRequirement
}

export interface AssignMandateInput {
  mandate_id: string
  case_id: string
}

export interface UpdateRequirementCheckInput {
  requirement_check_id: string
  status?: RequirementStatus
  evidence_id?: string | null
  note?: string | null
}

export const VERTICAL_OPTIONS = [
  { value: 'all', label: 'All Verticals' },
  { value: 'motor_assessor', label: 'Motor Assessor' },
  { value: 'property_assessor', label: 'Property Assessor' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'loss_adjuster', label: 'Loss Adjuster' },
]
