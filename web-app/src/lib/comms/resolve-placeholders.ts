import { formatCurrency } from '@/lib/utils/formatting'

export interface PlaceholderContext {
  locale?: string
  currencyCode?: string
  case?: {
    case_number?: string
    client_name?: string
    claim_reference?: string
    insurer_name?: string
    broker_name?: string
    loss_date?: string
    location?: string
  }
  assessment?: {
    outcome?: string
    claim_number?: string
    insurer_name?: string
    date_assessed?: string
    assessor_name?: string
    insured_name?: string
    policy_number?: string
  }
  vehicle?: {
    make?: string
    model?: string
    year_model?: number
    reg_number?: string
  }
  financials?: {
    total_excl_vat?: number
    grand_total?: number
  }
}

const PLACEHOLDER_MAP: Record<string, (ctx: PlaceholderContext) => string | undefined> = {
  CaseNumber:      (ctx) => ctx.case?.case_number,
  ClientName:      (ctx) => ctx.case?.client_name,
  ClaimReference:  (ctx) => ctx.case?.claim_reference,
  InsurerName:     (ctx) => ctx.assessment?.insurer_name ?? ctx.case?.insurer_name,
  BrokerName:      (ctx) => ctx.case?.broker_name,
  LossDate:        (ctx) => ctx.case?.loss_date,
  Location:        (ctx) => ctx.case?.location,

  Outcome:         (ctx) => ctx.assessment?.outcome,
  ClaimNumber:     (ctx) => ctx.assessment?.claim_number,
  DateAssessed:    (ctx) => ctx.assessment?.date_assessed,
  AssessorName:    (ctx) => ctx.assessment?.assessor_name,
  InsuredName:     (ctx) => ctx.assessment?.insured_name,
  PolicyNumber:    (ctx) => ctx.assessment?.policy_number,

  VehicleDetails:  (ctx) => {
    const v = ctx.vehicle
    if (!v) return undefined
    const parts = [v.year_model, v.make, v.model, v.reg_number].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : undefined
  },

  RepairTotal:     (ctx) => ctx.financials?.total_excl_vat != null
    ? formatCurrency(ctx.financials.total_excl_vat, ctx.locale, ctx.currencyCode)
    : undefined,

  GrandTotal:      (ctx) => ctx.financials?.grand_total != null
    ? formatCurrency(ctx.financials.grand_total, ctx.locale, ctx.currencyCode)
    : undefined,
}

/**
 * Replace all `{{Token}}` patterns in a template string with values from context.
 * Missing values are replaced with 'N/A'.
 */
export function resolvePlaceholders(template: string, ctx: PlaceholderContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    const resolver = PLACEHOLDER_MAP[token]
    if (!resolver) return 'N/A'
    return resolver(ctx) ?? 'N/A'
  })
}
