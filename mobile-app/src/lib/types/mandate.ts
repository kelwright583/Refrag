/**
 * Mandate types
 */

export type EvidenceType = 'photo' | 'video' | 'document' | 'text_note' | 'none';
export type RequirementStatus = 'missing' | 'provided' | 'not_applicable';

export interface Mandate {
  id: string;
  org_id: string;
  name: string;
  insurer_name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MandateRequirement {
  id: string;
  org_id: string;
  mandate_id: string;
  key: string;
  label: string;
  description: string | null;
  required: boolean;
  evidence_type: EvidenceType;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface RequirementCheck {
  id: string;
  org_id: string;
  case_id: string;
  mandate_requirement_id: string;
  status: RequirementStatus;
  evidence_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequirementCheckWithDetails extends RequirementCheck {
  requirement: MandateRequirement;
  evidence?: {
    id: string;
    file_name: string;
    media_type: 'photo' | 'video' | 'document';
  } | null;
}

export interface CaseMandate {
  id: string;
  org_id: string;
  case_id: string;
  mandate_id: string;
  created_at: string;
  updated_at: string;
}

export interface CaseMandateWithDetails extends CaseMandate {
  mandate: Mandate;
}

export interface AssignMandateInput {
  case_id: string;
  mandate_id: string;
}

export interface UpdateRequirementCheckInput {
  requirement_check_id: string;
  status?: RequirementStatus;
  evidence_id?: string | null;
  note?: string | null;
}
