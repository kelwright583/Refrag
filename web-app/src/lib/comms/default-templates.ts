/**
 * Default comms templates seeded per vertical on org creation.
 * Each template maps to a trigger_event and includes subject/body templates
 * with {{Placeholder}} tokens resolved at send-time.
 */

export interface DefaultCommsTemplate {
  name: string
  trigger_event: string
  subject_template: string
  body_template_md: string
  recipient_type: 'insurer' | 'broker' | 'client' | 'insured' | 'manual'
  vertical: string
}

// ────────────────────────────────────────────────────────────────────────────
// Motor Assessor Templates
// ────────────────────────────────────────────────────────────────────────────

const motorTemplates: DefaultCommsTemplate[] = [
  {
    name: 'Instruction Acknowledgement',
    trigger_event: 'document_drop_instruction',
    subject_template: 'Assessment Instruction Received — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

We acknowledge receipt of the assessment instruction for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{InsuredName}}
**Vehicle:** {{VehicleDetails}}
**Date of Loss:** {{LossDate}}
**Location:** {{Location}}

We will proceed with the assessment at the earliest convenience and revert with our findings.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Quote Received Update',
    trigger_event: 'document_drop_repairer_quote',
    subject_template: 'Repairer Quote Received — {{CaseNumber}}',
    body_template_md: `Dear {{BrokerName}},

Please be advised that we have received the repairer's quotation for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}

We are reviewing the quote and will incorporate it into the assessment report. An update will follow shortly.

Kind regards`,
    recipient_type: 'broker',
    vertical: 'motor_assessor',
  },
  {
    name: 'Site Visit Notification',
    trigger_event: 'status_change_on_site',
    subject_template: 'Site Visit Commenced — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

Please be advised that the site visit/inspection for the above-referenced claim is currently underway.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}
**Location:** {{Location}}

We will provide an update upon completion of the inspection.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Reporting ETA',
    trigger_event: 'status_change_reporting',
    subject_template: 'Assessment Report in Progress — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The assessment for the above-referenced claim has been completed and the report is being compiled.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}

We anticipate submitting the report within the next 24–48 hours.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Report Submitted',
    trigger_event: 'status_change_submitted',
    subject_template: 'Assessment Report Submitted — {{CaseNumber}} — {{Outcome}}',
    body_template_md: `Dear {{InsurerName}},

Please be advised that the assessment report for the above-referenced claim has been submitted.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}
**Outcome:** {{Outcome}}
**Repair Total:** {{RepairTotal}}

The full report pack is attached for your review. Should you require any amendments or clarification, please do not hesitate to contact us.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Missing Items Request',
    trigger_event: 'mandate_missing_items',
    subject_template: 'Outstanding Items Required — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

With reference to the above claim, we require the following outstanding items to complete our assessment:

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}

1. [Please specify required items]

Kindly furnish us with the above at your earliest convenience.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Invoice Delivery',
    trigger_event: 'invoice_issued',
    subject_template: 'Tax Invoice — {{CaseNumber}}',
    body_template_md: `Dear {{ClientName}},

Please find attached our tax invoice for the assessment conducted on the above-referenced claim.

**Claim Reference:** {{ClaimReference}}

Payment is due within 30 days of the invoice date. Our banking details are reflected on the invoice.

Kind regards`,
    recipient_type: 'client',
    vertical: 'motor_assessor',
  },
  {
    name: 'Report Pack Ready',
    trigger_event: 'report_pack_ready',
    subject_template: 'Assessment Report Pack — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The complete assessment report pack for the above-referenced claim is ready for your review.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}
**Outcome:** {{Outcome}}

The pack includes the assessment report, valuations, quotations, and photographic evidence.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'motor_assessor',
  },
  {
    name: 'Appointment Confirmation',
    trigger_event: 'appointment_scheduled',
    subject_template: 'Inspection Appointment Confirmed — {{CaseNumber}}',
    body_template_md: `Dear {{InsuredName}},

This confirms the vehicle inspection appointment for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Vehicle:** {{VehicleDetails}}
**Location:** {{Location}}

Please ensure the vehicle is accessible at the scheduled time. If you need to reschedule, please contact our office as soon as possible.

Kind regards`,
    recipient_type: 'insured',
    vertical: 'motor_assessor',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Property Assessor Templates
// ────────────────────────────────────────────────────────────────────────────

const propertyTemplates: DefaultCommsTemplate[] = [
  {
    name: 'Instruction Acknowledgement',
    trigger_event: 'document_drop_instruction',
    subject_template: 'Assessment Instruction Received — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

We acknowledge receipt of the property assessment instruction for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{InsuredName}}
**Location:** {{Location}}
**Date of Loss:** {{LossDate}}

We will arrange an inspection at the earliest convenience and revert with our findings.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Quote Received Update',
    trigger_event: 'document_drop_repairer_quote',
    subject_template: 'Contractor Quote Received — {{CaseNumber}}',
    body_template_md: `Dear {{BrokerName}},

We have received the contractor's quotation for reinstatement of the above-referenced property claim.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}

We are reviewing the quotation and will incorporate it into our assessment report.

Kind regards`,
    recipient_type: 'broker',
    vertical: 'property_assessor',
  },
  {
    name: 'Site Visit Notification',
    trigger_event: 'status_change_on_site',
    subject_template: 'Property Inspection Commenced — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The property inspection for the above-referenced claim is currently in progress.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}

We will provide a detailed update upon completion.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Reporting ETA',
    trigger_event: 'status_change_reporting',
    subject_template: 'Assessment Report in Progress — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The property inspection has been completed and the reinstatement assessment report is being compiled.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}

We anticipate submitting the report within the next 48 hours.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Report Submitted',
    trigger_event: 'status_change_submitted',
    subject_template: 'Assessment Report Submitted — {{CaseNumber}} — {{Outcome}}',
    body_template_md: `Dear {{InsurerName}},

The property assessment report for the above-referenced claim has been submitted.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}
**Outcome:** {{Outcome}}
**Reinstatement Total:** {{RepairTotal}}

The full report pack including supporting documentation is attached.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Missing Items Request',
    trigger_event: 'mandate_missing_items',
    subject_template: 'Outstanding Items Required — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

We require the following outstanding items to finalise our property assessment:

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}

1. [Please specify required items]

Kindly provide the above at your earliest convenience.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Invoice Delivery',
    trigger_event: 'invoice_issued',
    subject_template: 'Tax Invoice — {{CaseNumber}}',
    body_template_md: `Dear {{ClientName}},

Please find attached our tax invoice for the property assessment conducted on the above-referenced claim.

**Claim Reference:** {{ClaimReference}}

Payment is due within 30 days.

Kind regards`,
    recipient_type: 'client',
    vertical: 'property_assessor',
  },
  {
    name: 'Report Pack Ready',
    trigger_event: 'report_pack_ready',
    subject_template: 'Property Assessment Report Pack — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The complete property assessment report pack is ready for your review.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}
**Outcome:** {{Outcome}}

The pack includes the assessment report, contractor quotes, photographic evidence, and supporting documentation.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'property_assessor',
  },
  {
    name: 'Appointment Confirmation',
    trigger_event: 'appointment_scheduled',
    subject_template: 'Property Inspection Appointment — {{CaseNumber}}',
    body_template_md: `Dear {{InsuredName}},

This confirms the property inspection appointment for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Location:** {{Location}}

Please ensure access to all affected areas of the property. Contact us if you need to reschedule.

Kind regards`,
    recipient_type: 'insured',
    vertical: 'property_assessor',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Investigator Templates
// ────────────────────────────────────────────────────────────────────────────

const investigatorTemplates: DefaultCommsTemplate[] = [
  {
    name: 'Referral Acknowledgement',
    trigger_event: 'document_drop_instruction',
    subject_template: 'Investigation Referral Acknowledged — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

We acknowledge receipt of the investigation referral for the above-referenced matter.

**Claim Reference:** {{ClaimReference}}
**Date of Loss:** {{LossDate}}

We will commence our investigation and revert with a preliminary update.

This correspondence is strictly confidential.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Documentation Received',
    trigger_event: 'document_drop_repairer_quote',
    subject_template: 'Supporting Documentation Received — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

We have received supporting documentation relating to the above-referenced investigation.

**Claim Reference:** {{ClaimReference}}

The documentation will be reviewed and incorporated into our findings.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Field Investigation Commenced',
    trigger_event: 'status_change_on_site',
    subject_template: 'Field Investigation Commenced — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

Field investigation activities for the above-referenced matter have commenced.

**Claim Reference:** {{ClaimReference}}

We will provide an update upon completion of the field phase.

This correspondence is strictly confidential.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Report Compilation',
    trigger_event: 'status_change_reporting',
    subject_template: 'Investigation Report in Progress — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The investigation for the above-referenced matter is complete and the report is being compiled.

**Claim Reference:** {{ClaimReference}}

The report will be submitted within the agreed timeframe.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Report Submitted',
    trigger_event: 'status_change_submitted',
    subject_template: 'Investigation Report Submitted — {{CaseNumber}} — {{Outcome}}',
    body_template_md: `Dear {{InsurerName}},

The investigation report for the above-referenced matter has been submitted.

**Claim Reference:** {{ClaimReference}}
**Finding:** {{Outcome}}

The full report with supporting evidence annexures is attached. This document is strictly confidential.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Additional Information Required',
    trigger_event: 'mandate_missing_items',
    subject_template: 'Information Request — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

To progress the investigation into the above-referenced matter, we require the following:

**Claim Reference:** {{ClaimReference}}

1. [Please specify required information]

Kindly provide the above at your earliest convenience.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Fee Note',
    trigger_event: 'invoice_issued',
    subject_template: 'Fee Note — {{CaseNumber}}',
    body_template_md: `Dear {{ClientName}},

Please find attached our fee note for the investigation conducted on the above-referenced matter.

**Claim Reference:** {{ClaimReference}}

Payment is due within 30 days.

Kind regards`,
    recipient_type: 'client',
    vertical: 'investigator',
  },
  {
    name: 'Report Pack Ready',
    trigger_event: 'report_pack_ready',
    subject_template: 'Investigation Report Pack — {{CaseNumber}}',
    body_template_md: `Dear {{InsurerName}},

The complete investigation report pack for the above-referenced matter is ready for your review.

**Claim Reference:** {{ClaimReference}}
**Finding:** {{Outcome}}

This document is strictly confidential and intended for the addressee only.

Kind regards`,
    recipient_type: 'insurer',
    vertical: 'investigator',
  },
  {
    name: 'Appointment Confirmation',
    trigger_event: 'appointment_scheduled',
    subject_template: 'Meeting Scheduled — {{CaseNumber}}',
    body_template_md: `Dear {{InsuredName}},

This confirms the scheduled appointment regarding the above-referenced matter.

**Reference:** {{ClaimReference}}
**Location:** {{Location}}

Please have all relevant documentation available. Contact us if you need to reschedule.

Kind regards`,
    recipient_type: 'insured',
    vertical: 'investigator',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COMMS_TEMPLATES: Record<string, DefaultCommsTemplate[]> = {
  motor_assessor: motorTemplates,
  property_assessor: propertyTemplates,
  investigator: investigatorTemplates,
  loss_adjuster: motorTemplates,
  general: motorTemplates,
}

export function getDefaultTemplatesForVertical(vertical: string): DefaultCommsTemplate[] {
  return DEFAULT_COMMS_TEMPLATES[vertical] || DEFAULT_COMMS_TEMPLATES.general
}
