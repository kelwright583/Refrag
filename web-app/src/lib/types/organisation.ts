/**
 * Organisation types (extended for specialisations)
 */

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

export const SPECIALISATION_DESCRIPTIONS: Record<OrgSpecialisation, string> = {
  motor_assessor: 'Vehicle damage assessment',
  property_assessor: 'Building and contents assessment',
  loss_adjuster: 'Motor, property, contents, business interruption — all covers',
  investigator: 'Fraud, liability, and general investigation',
  general: 'Full capability across all verticals',
}
