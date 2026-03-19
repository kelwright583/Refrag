import { type ComponentType } from 'react'
import { type SectionKey } from '@/lib/verticals/config'

export interface SectionProps {
  caseId: string
  orgSettings: any
}

import { InstructionDetailsSection } from './InstructionDetailsSection'
import { VehicleSummarySection } from './VehicleSummarySection'
import { PropertySummarySection } from './PropertySummarySection'
import { ReferralDetailsSection } from './ReferralDetailsSection'
import { PartiesSummarySection } from './PartiesSummarySection'
import { ContactsSection } from './ContactsSection'
import { MandateProgressSection } from './MandateProgressSection'
import { CaseNotesSection } from './CaseNotesSection'
import { TimelineSection } from './TimelineSection'

import { EvidenceGridSection } from './EvidenceGridSection'
import { ValuationDropSection } from './ValuationDropSection'
import { RepairerQuoteDropSection } from './RepairerQuoteDropSection'
import { PartsQuoteDropSection } from './PartsQuoteDropSection'
import { ContractorQuoteDropSection } from './ContractorQuoteDropSection'
import { ContentsListDropSection } from './ContentsListDropSection'
import { StatementUploadSection } from './StatementUploadSection'
import { DocumentLogSection } from './DocumentLogSection'
import { MandateChecklistSection } from './MandateChecklistSection'

import { DamageLabourSection } from './DamageLabourSection'
import { PartsAssessmentSection } from './PartsAssessmentSection'
import { TyreGridSection } from './TyreGridSection'
import { VehicleValuesSection } from './VehicleValuesSection'
import { PropertyDamageSectionsSection } from './PropertyDamageSectionsSection'
import { ContractorQuotesSection } from './ContractorQuotesSection'
import { ReinstatementValuesSection } from './ReinstatementValuesSection'
import { ContentsInventorySection } from './ContentsInventorySection'
import { QuantumReconciliationSection } from './QuantumReconciliationSection'
import { FindingsListSection } from './FindingsListSection'
import { InvestigationTimelineSection } from './InvestigationTimelineSection'
import { PartiesStatementsSection } from './PartiesStatementsSection'
import { RedFlagsSection } from './RedFlagsSection'
import { TimeDisbursementsSection } from './TimeDisbursementsSection'

import { ReportBuilderSection } from './ReportBuilderSection'
import { OutcomeFinancialsSection } from './OutcomeFinancialsSection'
import { ReportPreviewSection } from './ReportPreviewSection'

import { PackBuilderSection } from './PackBuilderSection'
import { InvoiceBuilderSection } from './InvoiceBuilderSection'

export const SECTION_COMPONENTS: Record<SectionKey, ComponentType<SectionProps>> = {
  // Overview
  instruction_details: InstructionDetailsSection,
  vehicle_summary: VehicleSummarySection,
  property_summary: PropertySummarySection,
  referral_details: ReferralDetailsSection,
  parties_summary: PartiesSummarySection,
  contacts: ContactsSection,
  mandate_progress: MandateProgressSection,
  case_notes: CaseNotesSection,
  timeline: TimelineSection,

  // Capture
  evidence_grid: EvidenceGridSection,
  valuation_drop: ValuationDropSection,
  repairer_quote_drop: RepairerQuoteDropSection,
  parts_quote_drop: PartsQuoteDropSection,
  contractor_quote_drop: ContractorQuoteDropSection,
  contents_list_drop: ContentsListDropSection,
  statement_upload: StatementUploadSection,
  document_log: DocumentLogSection,
  mandate_checklist: MandateChecklistSection,

  // Assessment
  damage_labour: DamageLabourSection,
  parts_assessment: PartsAssessmentSection,
  tyre_grid: TyreGridSection,
  vehicle_values: VehicleValuesSection,
  property_damage_sections: PropertyDamageSectionsSection,
  contractor_quotes: ContractorQuotesSection,
  reinstatement_values: ReinstatementValuesSection,
  contents_inventory: ContentsInventorySection,
  quantum_reconciliation: QuantumReconciliationSection,
  findings_list: FindingsListSection,
  investigation_timeline: InvestigationTimelineSection,
  parties_statements: PartiesStatementsSection,
  red_flags: RedFlagsSection,
  time_disbursements: TimeDisbursementsSection,

  // Report
  report_builder: ReportBuilderSection,
  outcome_financials: OutcomeFinancialsSection,
  report_preview: ReportPreviewSection,

  // Pack & Invoice
  pack_builder: PackBuilderSection,
  invoice_builder: InvoiceBuilderSection,
}

const SECTION_LABELS: Record<SectionKey, string> = {
  instruction_details: 'Instruction Details',
  vehicle_summary: 'Vehicle Summary',
  property_summary: 'Property Summary',
  referral_details: 'Referral Details',
  parties_summary: 'Parties',
  contacts: 'Contacts',
  mandate_progress: 'Mandate Progress',
  case_notes: 'Case Notes',
  timeline: 'Timeline',

  evidence_grid: 'Evidence',
  valuation_drop: 'Valuation Printout',
  repairer_quote_drop: 'Repairer Quote',
  parts_quote_drop: 'Parts Quote',
  contractor_quote_drop: 'Contractor Quote',
  contents_list_drop: 'Contents List',
  statement_upload: 'Statements',
  document_log: 'Document Log',
  mandate_checklist: 'Mandate Checklist',

  damage_labour: 'Damage & Labour',
  parts_assessment: 'Parts Assessment',
  tyre_grid: 'Tyre Assessment',
  vehicle_values: 'Vehicle Values',
  property_damage_sections: 'Property Damage',
  contractor_quotes: 'Contractor Quotes',
  reinstatement_values: 'Reinstatement Values',
  contents_inventory: 'Contents Inventory',
  quantum_reconciliation: 'Quantum Reconciliation',
  findings_list: 'Findings',
  investigation_timeline: 'Investigation Timeline',
  parties_statements: 'Parties & Statements',
  red_flags: 'Red Flags',
  time_disbursements: 'Time & Disbursements',

  report_builder: 'Report Builder',
  outcome_financials: 'Outcome & Financials',
  report_preview: 'Report Preview',

  pack_builder: 'Report Pack',
  invoice_builder: 'Invoice',
}

export function getSectionLabel(key: SectionKey): string {
  return SECTION_LABELS[key] ?? key
}
