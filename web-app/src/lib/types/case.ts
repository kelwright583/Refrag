/**
 * Case types
 */

import type { CaseRiskItem } from './risk-item'
import type { WriteOffStatus } from './client-rule'

export type CaseStatus = 
  | 'draft'
  | 'assigned'
  | 'site_visit'
  | 'awaiting_quote'
  | 'reporting'
  | 'submitted'
  | 'additional'
  | 'closed';

export type CasePriority = 'low' | 'normal' | 'high';

export interface Case {
  id: string;
  org_id: string;
  created_by: string;
  case_number: string;
  client_id: string | null;
  client_name: string;
  insurer_name: string | null;
  broker_name: string | null;
  claim_reference: string | null;
  insurer_reference: string | null;
  loss_date: string | null;
  location: string | null;
  status: CaseStatus;
  priority: CasePriority;
  primary_risk_item_id: string | null;
  repair_estimate_amount: number | null;
  write_off_status: WriteOffStatus | null;
  created_at: string;
  updated_at: string;
}

/** Case with eagerly-loaded risk items */
export interface CaseWithRiskItems extends Case {
  risk_items?: CaseRiskItem[];
}

export interface CreateCaseInput {
  client_id?: string;
  client_name: string;
  insurer_name?: string;
  broker_name?: string;
  claim_reference?: string;
  insurer_reference?: string;
  loss_date?: string;
  location?: string;
  status?: CaseStatus;
  priority?: CasePriority;
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {
  repair_estimate_amount?: number | null;
  write_off_status?: WriteOffStatus | null;
}
