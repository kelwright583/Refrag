export type VerticalId =
  | 'motor_assessor'
  | 'property_assessor'
  | 'loss_adjuster'
  | 'investigator'
  | 'general'

export type SectionKey =
  // Overview sections
  | 'instruction_details'
  | 'vehicle_summary'
  | 'property_summary'
  | 'referral_details'
  | 'parties_summary'
  | 'contacts'
  | 'mandate_progress'
  | 'case_notes'
  | 'timeline'
  // Capture sections
  | 'evidence_grid'
  | 'valuation_drop'
  | 'repairer_quote_drop'
  | 'parts_quote_drop'
  | 'contractor_quote_drop'
  | 'contents_list_drop'
  | 'statement_upload'
  | 'document_log'
  | 'mandate_checklist'
  // Assessment sections
  | 'damage_labour'
  | 'parts_assessment'
  | 'tyre_grid'
  | 'vehicle_values'
  | 'property_damage_sections'
  | 'contractor_quotes'
  | 'reinstatement_values'
  | 'contents_inventory'
  | 'quantum_reconciliation'
  | 'findings_list'
  | 'investigation_timeline'
  | 'parties_statements'
  | 'red_flags'
  | 'time_disbursements'
  // Report sections
  | 'report_builder'
  | 'outcome_financials'
  | 'report_preview'
  // Pack sections
  | 'pack_builder'
  | 'invoice_builder'

export interface ReportSectionTemplate {
  key: string
  heading: string
  description: string
  isRequired: boolean
  aiDraftAvailable: boolean
}

export interface VerticalConfig {
  id: VerticalId
  label: string
  description: string
  icon: string

  terminology: {
    riskItem: string
    riskItemPlural: string
    identifier: string
    financialSummary: string
    outcome: string
    instructingParty: string
    assessmentVerb: string
  }

  sections: {
    overview: SectionKey[]
    capture: SectionKey[]
    assessment: SectionKey[]
    report: SectionKey[]
    pack: SectionKey[]
  }

  reportSections: ReportSectionTemplate[]

  financialModule:
    | 'motor_repair'
    | 'property_reinstatement'
    | 'loss_adjuster'
    | 'time_disbursement'
    | 'none'

  defaultMandateKeys: string[]

  commsTemplateSet: string

  defaultOutcomes: string[]

  riskTypes: string[]
}

// ---------------------------------------------------------------------------
// Motor Assessor
// ---------------------------------------------------------------------------

const motorAssessor: VerticalConfig = {
  id: 'motor_assessor',
  label: 'Motor Assessor',
  description: 'Vehicle damage assessment, repair costing, and write-off valuations',
  icon: 'Car',

  terminology: {
    riskItem: 'Vehicle',
    riskItemPlural: 'Vehicles',
    identifier: 'VIN',
    financialSummary: 'Repair estimate',
    outcome: 'Repair/Write-off',
    instructingParty: 'Insurer',
    assessmentVerb: 'assess',
  },

  sections: {
    overview: [
      'instruction_details',
      'vehicle_summary',
      'contacts',
      'mandate_progress',
      'case_notes',
    ],
    capture: [
      'evidence_grid',
      'valuation_drop',
      'repairer_quote_drop',
      'parts_quote_drop',
      'mandate_checklist',
    ],
    assessment: [
      'damage_labour',
      'parts_assessment',
      'tyre_grid',
      'vehicle_values',
    ],
    report: ['report_builder', 'outcome_financials', 'report_preview'],
    pack: ['pack_builder', 'invoice_builder'],
  },

  reportSections: [
    {
      key: 'instruction',
      heading: 'Instruction Details',
      description: 'Nature of instruction, date received, insurer reference',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'insured',
      heading: 'Insured / Claimant Details',
      description: 'Name, contact, policy number, claim number',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'assessor',
      heading: 'Assessor Details',
      description: 'Assessor name, qualifications, inspection date and location',
      isRequired: true,
      aiDraftAvailable: false,
    },
    {
      key: 'vehicle',
      heading: 'Vehicle Description',
      description: 'Year, make, model, VIN, registration, colour, mileage',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'condition',
      heading: 'General Condition',
      description: 'Overall condition of the vehicle at time of inspection',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'damage',
      heading: 'Damage Description',
      description: 'Narrative description of damage sustained',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'pre_existing',
      heading: 'Pre-existing Damage',
      description: 'Damage unrelated to this incident',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'tyres',
      heading: 'Tyre Assessment',
      description: 'Tyre brand, tread depth, condition per position',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'valuation',
      heading: 'Vehicle Valuation',
      description: 'Retail, trade, and market values with sources',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'repairer',
      heading: 'Repairer Details & Quote',
      description: 'Selected repairer, quote number, validity',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'line_items',
      heading: 'Repair Line Items',
      description: 'Detailed labour operations, strip/fit, paint',
      isRequired: true,
      aiDraftAvailable: false,
    },
    {
      key: 'parts',
      heading: 'Parts Schedule',
      description: 'New, used, aftermarket parts breakdown with pricing',
      isRequired: true,
      aiDraftAvailable: false,
    },
    {
      key: 'financials',
      heading: 'Financial Summary',
      description: 'Total repair cost, betterment, excess, VAT, net payable',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'outcome',
      heading: 'Outcome & Recommendation',
      description: 'Repair authorisation or write-off recommendation',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'declaration',
      heading: 'Assessor Declaration',
      description: 'Signed declaration of independence and accuracy',
      isRequired: true,
      aiDraftAvailable: false,
    },
  ],

  financialModule: 'motor_repair',

  defaultMandateKeys: [
    'inspect_vehicle',
    'photograph_damage',
    'obtain_repairer_quote',
    'obtain_parts_prices',
    'check_valuations',
    'compile_report',
    'submit_report',
  ],

  commsTemplateSet: 'motor',

  defaultOutcomes: [
    'repairable',
    'write_off',
    'theft_total',
    'partial_theft',
    'rejection',
    'further_investigation',
  ],

  riskTypes: ['motor_vehicle'],
}

// ---------------------------------------------------------------------------
// Property Assessor
// ---------------------------------------------------------------------------

const propertyAssessor: VerticalConfig = {
  id: 'property_assessor',
  label: 'Property Assessor',
  description:
    'Building, contents, and structural damage assessment with reinstatement costing',
  icon: 'Building2',

  terminology: {
    riskItem: 'Property',
    riskItemPlural: 'Properties',
    identifier: 'Erf number',
    financialSummary: 'Reinstatement value',
    outcome: 'Loss recommendation',
    instructingParty: 'Insurer',
    assessmentVerb: 'assess',
  },

  sections: {
    overview: [
      'instruction_details',
      'property_summary',
      'contacts',
      'mandate_progress',
      'case_notes',
    ],
    capture: [
      'evidence_grid',
      'contractor_quote_drop',
      'contents_list_drop',
      'document_log',
      'mandate_checklist',
    ],
    assessment: [
      'property_damage_sections',
      'contractor_quotes',
      'reinstatement_values',
      'contents_inventory',
    ],
    report: ['report_builder', 'outcome_financials', 'report_preview'],
    pack: ['pack_builder', 'invoice_builder'],
  },

  reportSections: [
    {
      key: 'instruction',
      heading: 'Instruction Details',
      description: 'Nature of loss, date of instruction, insurer reference',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'property_details',
      heading: 'Property Details',
      description: 'Address, erf number, property type, construction, sum insured',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'damage_summary',
      heading: 'Damage Summary by Area',
      description: 'Room-by-room or area-by-area damage description',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'contents_schedule',
      heading: 'Contents Schedule',
      description: 'Itemised list of damaged/lost contents with values',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'contractor_quotes',
      heading: 'Contractor Quotes',
      description: 'Quotes received, comparison, selected contractor',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'reinstatement_values',
      heading: 'Reinstatement Values',
      description: 'Building reinstatement, contents replacement, combined total',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'financials',
      heading: 'Financial Summary',
      description:
        'Total loss, betterment, under-insurance, excess, VAT, net payable',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'outcome',
      heading: 'Outcome & Recommendation',
      description: 'Repair, replacement, cash settlement recommendation',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'findings',
      heading: 'Findings & Observations',
      description: 'Additional observations, cause of loss, compliance notes',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'declaration',
      heading: 'Assessor Declaration',
      description: 'Signed declaration of independence and accuracy',
      isRequired: true,
      aiDraftAvailable: false,
    },
  ],

  financialModule: 'property_reinstatement',

  defaultMandateKeys: [
    'inspect_property',
    'photograph_damage',
    'obtain_contractor_quotes',
    'assess_contents',
    'calculate_reinstatement',
    'compile_report',
    'submit_report',
  ],

  commsTemplateSet: 'property',

  defaultOutcomes: [
    'repair',
    'replacement',
    'cash_settlement',
    'rejection',
    'further_investigation',
  ],

  riskTypes: ['building', 'contents', 'stock', 'business_interruption'],
}

// ---------------------------------------------------------------------------
// Loss Adjuster
// ---------------------------------------------------------------------------

const lossAdjuster: VerticalConfig = {
  id: 'loss_adjuster',
  label: 'Loss Adjuster',
  description:
    'Multi-peril loss adjustment combining motor, property, and liability assessment',
  icon: 'Scale',

  terminology: {
    riskItem: 'Risk item',
    riskItemPlural: 'Risk items',
    identifier: 'Reference',
    financialSummary: 'Quantum',
    outcome: 'Loss recommendation',
    instructingParty: 'Instructing party',
    assessmentVerb: 'adjust',
  },

  sections: {
    overview: [
      'instruction_details',
      'vehicle_summary',
      'property_summary',
      'parties_summary',
      'contacts',
      'mandate_progress',
      'case_notes',
      'timeline',
    ],
    capture: [
      'evidence_grid',
      'valuation_drop',
      'repairer_quote_drop',
      'parts_quote_drop',
      'contractor_quote_drop',
      'contents_list_drop',
      'statement_upload',
      'document_log',
      'mandate_checklist',
    ],
    assessment: [
      'damage_labour',
      'parts_assessment',
      'tyre_grid',
      'vehicle_values',
      'property_damage_sections',
      'contractor_quotes',
      'reinstatement_values',
      'contents_inventory',
      'quantum_reconciliation',
    ],
    report: ['report_builder', 'outcome_financials', 'report_preview'],
    pack: ['pack_builder', 'invoice_builder'],
  },

  reportSections: [
    {
      key: 'instruction',
      heading: 'Instruction & Mandate',
      description: 'Source of instruction, mandate scope, date received',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'insured',
      heading: 'Insured / Claimant Details',
      description: 'Policyholder, contact, policy schedule',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'background',
      heading: 'Background & Circumstances',
      description: 'Narrative of events leading to the loss',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'policy_review',
      heading: 'Policy Review',
      description: 'Applicable sections, endorsements, exclusions',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'risk_items',
      heading: 'Risk Items Summary',
      description: 'All risk items assessed (vehicles, property, contents)',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'damage_assessment',
      heading: 'Damage / Loss Assessment',
      description: 'Detailed assessment per risk item',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'quantum',
      heading: 'Quantum Reconciliation',
      description: 'Claimed vs assessed amounts, adjustments, rationale',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'liability',
      heading: 'Liability & Indemnity',
      description: 'Liability assessment, indemnity basis, average/co-insurance',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'financials',
      heading: 'Financial Summary',
      description: 'Total quantum, deductions, excess, net recommendation',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'outcome',
      heading: 'Outcome & Recommendation',
      description: 'Final recommendation to insurer',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'declaration',
      heading: 'Adjuster Declaration',
      description: 'Signed declaration of independence and accuracy',
      isRequired: true,
      aiDraftAvailable: false,
    },
  ],

  financialModule: 'loss_adjuster',

  defaultMandateKeys: [
    'confirm_instruction',
    'review_policy',
    'inspect_risk',
    'assess_liability',
    'quantify_loss',
    'obtain_supporting_docs',
    'compile_report',
    'submit_report',
  ],

  commsTemplateSet: 'loss_adjuster',

  defaultOutcomes: [
    'repairable',
    'write_off',
    'repair',
    'replacement',
    'cash_settlement',
    'rejection',
    'partial_repudiation',
    'further_investigation',
    'referred_siu',
  ],

  riskTypes: [
    'motor_vehicle',
    'building',
    'contents',
    'stock',
    'business_interruption',
    'liability',
    'other',
  ],
}

// ---------------------------------------------------------------------------
// Investigator
// ---------------------------------------------------------------------------

const investigator: VerticalConfig = {
  id: 'investigator',
  label: 'Investigator',
  description:
    'Fraud investigation, SIU referrals, and forensic claims investigation',
  icon: 'Search',

  terminology: {
    riskItem: 'Subject',
    riskItemPlural: 'Subjects',
    identifier: 'Subject ID',
    financialSummary: 'Fee note',
    outcome: 'Finding',
    instructingParty: 'Referral source',
    assessmentVerb: 'investigate',
  },

  sections: {
    overview: [
      'instruction_details',
      'referral_details',
      'parties_summary',
      'contacts',
      'mandate_progress',
      'case_notes',
      'timeline',
    ],
    capture: [
      'evidence_grid',
      'statement_upload',
      'document_log',
      'mandate_checklist',
    ],
    assessment: [
      'findings_list',
      'investigation_timeline',
      'parties_statements',
      'red_flags',
      'time_disbursements',
    ],
    report: ['report_builder', 'outcome_financials', 'report_preview'],
    pack: ['pack_builder', 'invoice_builder'],
  },

  reportSections: [
    {
      key: 'cover_page',
      heading: 'Cover Page',
      description: 'Confidential cover with reference, date, classification',
      isRequired: true,
      aiDraftAvailable: false,
    },
    {
      key: 'mandate',
      heading: 'Mandate & Instruction',
      description: 'Referral source, mandate scope, specific questions to address',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'methodology',
      heading: 'Methodology',
      description: 'Investigation approach, techniques used, limitations',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'parties',
      heading: 'Parties Involved',
      description: 'Subjects, witnesses, third parties identified during investigation',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'findings',
      heading: 'Findings',
      description: 'Numbered findings with supporting evidence references',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'evidence_annexure',
      heading: 'Evidence Annexure',
      description: 'Index of evidence items with descriptions and references',
      isRequired: true,
      aiDraftAvailable: false,
    },
    {
      key: 'red_flag_summary',
      heading: 'Red Flag Summary',
      description: 'Summary of red flags and indicators identified',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'outcome',
      heading: 'Outcome & Recommendation',
      description: 'Overall finding and recommended course of action',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'declaration',
      heading: 'Investigator Declaration',
      description: 'Signed declaration of independence, methods, and accuracy',
      isRequired: true,
      aiDraftAvailable: false,
    },
  ],

  financialModule: 'time_disbursement',

  defaultMandateKeys: [
    'confirm_referral',
    'review_claim_file',
    'conduct_interviews',
    'obtain_statements',
    'verify_documentation',
    'conduct_site_visit',
    'compile_findings',
    'compile_report',
    'submit_report',
  ],

  commsTemplateSet: 'investigator',

  defaultOutcomes: [
    'substantiated',
    'unsubstantiated',
    'partially_substantiated',
    'referred_siu',
    'inconclusive',
  ],

  riskTypes: ['fraud', 'liability', 'theft', 'arson', 'other'],
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

const general: VerticalConfig = {
  id: 'general',
  label: 'General',
  description: 'Flexible configuration for any assessment or consulting vertical',
  icon: 'Briefcase',

  terminology: {
    riskItem: 'Risk item',
    riskItemPlural: 'Risk items',
    identifier: 'Reference',
    financialSummary: 'Assessment summary',
    outcome: 'Outcome',
    instructingParty: 'Client',
    assessmentVerb: 'assess',
  },

  sections: {
    overview: [
      'instruction_details',
      'vehicle_summary',
      'property_summary',
      'referral_details',
      'parties_summary',
      'contacts',
      'mandate_progress',
      'case_notes',
      'timeline',
    ],
    capture: [
      'evidence_grid',
      'valuation_drop',
      'repairer_quote_drop',
      'parts_quote_drop',
      'contractor_quote_drop',
      'contents_list_drop',
      'statement_upload',
      'document_log',
      'mandate_checklist',
    ],
    assessment: [
      'damage_labour',
      'parts_assessment',
      'tyre_grid',
      'vehicle_values',
      'property_damage_sections',
      'contractor_quotes',
      'reinstatement_values',
      'contents_inventory',
      'quantum_reconciliation',
      'findings_list',
      'investigation_timeline',
      'parties_statements',
      'red_flags',
      'time_disbursements',
    ],
    report: ['report_builder', 'outcome_financials', 'report_preview'],
    pack: ['pack_builder', 'invoice_builder'],
  },

  reportSections: [
    {
      key: 'instruction',
      heading: 'Instruction Details',
      description: 'Nature of instruction, scope, date received',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'background',
      heading: 'Background',
      description: 'Circumstances and context of the matter',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'assessment',
      heading: 'Assessment',
      description: 'Detailed assessment findings',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'financials',
      heading: 'Financial Summary',
      description: 'Cost breakdown and financial recommendations',
      isRequired: false,
      aiDraftAvailable: true,
    },
    {
      key: 'outcome',
      heading: 'Outcome & Recommendation',
      description: 'Final recommendation',
      isRequired: true,
      aiDraftAvailable: true,
    },
    {
      key: 'declaration',
      heading: 'Declaration',
      description: 'Signed declaration',
      isRequired: true,
      aiDraftAvailable: false,
    },
  ],

  financialModule: 'none',

  defaultMandateKeys: [
    'confirm_instruction',
    'conduct_inspection',
    'gather_evidence',
    'compile_report',
    'submit_report',
  ],

  commsTemplateSet: 'general',

  defaultOutcomes: [
    'repairable',
    'write_off',
    'repair',
    'replacement',
    'cash_settlement',
    'rejection',
    'substantiated',
    'unsubstantiated',
    'further_investigation',
    'referred_siu',
    'inconclusive',
  ],

  riskTypes: [
    'motor_vehicle',
    'building',
    'contents',
    'stock',
    'business_interruption',
    'liability',
    'fraud',
    'theft',
    'arson',
    'other',
  ],
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const VERTICAL_CONFIGS: Record<VerticalId, VerticalConfig> = {
  motor_assessor: motorAssessor,
  property_assessor: propertyAssessor,
  loss_adjuster: lossAdjuster,
  investigator,
  general,
}

export const VERTICAL_IDS = Object.keys(VERTICAL_CONFIGS) as VerticalId[]
