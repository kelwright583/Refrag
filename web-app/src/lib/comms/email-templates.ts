export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'assessment_instruction_received',
    name: 'Assessment Instruction Received',
    subject: 'Assessment Instruction Received - {{CaseNumber}}',
    body: `Dear {{InsurerName}},

We acknowledge receipt of your assessment instruction for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}
**Date of Loss:** {{LossDate}}
**Location:** {{Location}}

We will proceed with the assessment at the earliest convenience and revert with our findings.

Should you require any additional information in the interim, please do not hesitate to contact our office.

Kind regards,
Refrag Assessors`,
  },
  {
    id: 'assessment_complete',
    name: 'Assessment Complete',
    subject: 'Assessment Complete - {{CaseNumber}} - {{Outcome}}',
    body: `Dear {{InsurerName}},

Please be advised that the motor vehicle assessment for the above-referenced claim has been completed.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}
**Date of Loss:** {{LossDate}}
**Outcome:** {{Outcome}}

The full assessment report pack, including supporting documentation, is attached for your review.

Should you have any queries regarding the assessment or require further clarification, please do not hesitate to contact us.

Kind regards,
Refrag Assessors`,
  },
  {
    id: 'write_off_notification',
    name: 'Write-off Notification',
    subject: 'Write-off Notification - {{CaseNumber}}',
    body: `Dear {{InsurerName}},

Further to our assessment of the above-referenced claim, we wish to advise that the vehicle has been assessed as an **economic write-off**.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}
**Date of Loss:** {{LossDate}}

The cost of repairs exceeds the economical repair threshold relative to the vehicle's market value. A detailed breakdown is included in the attached assessment report pack.

We recommend the claim be settled on a total-loss basis. Please contact our office should you require the salvage valuation or any additional information.

Kind regards,
Refrag Assessors`,
  },
  {
    id: 'request_additional_info',
    name: 'Request for Additional Information',
    subject: 'Additional Information Required - {{CaseNumber}}',
    body: `Dear {{InsurerName}},

With reference to the above claim, we require the following additional information to complete our assessment:

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}

1. [Please specify the required information]
2. [Please specify the required information]

Kindly furnish us with the above at your earliest convenience so that we may proceed without further delay.

Kind regards,
Refrag Assessors`,
  },
  {
    id: 'invoice_delivery',
    name: 'Invoice Delivery',
    subject: 'Invoice - {{CaseNumber}}',
    body: `Dear {{InsurerName}},

Please find attached our tax invoice for the assessment conducted on the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}

Payment is due within 30 days of the invoice date. Our banking details are reflected on the invoice.

Should you have any queries, please do not hesitate to contact us.

Kind regards,
Refrag Assessors`,
  },
  {
    id: 'report_pack_delivery',
    name: 'Report Pack Delivery',
    subject: 'Assessment Report Pack - {{CaseNumber}}',
    body: `Dear {{InsurerName}},

Please find attached the complete assessment report pack for the above-referenced claim.

**Claim Reference:** {{ClaimReference}}
**Insured:** {{ClientName}}
**Date of Loss:** {{LossDate}}
**Location:** {{Location}}

The pack includes:
- Assessment Report
- MM Code / TransUnion Valuation
- Parts Quotation
- Repairer Labour Estimate
- Photographic Evidence

Please review the documentation and advise should you require any amendments or additional information.

Kind regards,
Refrag Assessors`,
  },
]

export function resolveTemplatePlaceholders(
  text: string,
  data: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] ?? match)
}
