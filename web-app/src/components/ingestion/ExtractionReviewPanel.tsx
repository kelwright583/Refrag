'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { ExtractionResult, ExtractedField, FieldConfidence, ConfirmedFields } from '@/lib/types/ingestion'

interface Props {
  result: ExtractionResult
  onConfirm: (fields: ConfirmedFields) => void
  onCancel: () => void
}

/** Human-readable labels for each canonical field */
const FIELD_LABELS: Partial<Record<keyof ExtractionResult, string>> = {
  claim_reference: 'Claim Reference',
  insurer_name: 'Insurer',
  broker_name: 'Broker',
  loss_date: 'Date of Loss',
  insured_name: 'Insured Name',
  insured_contact: 'Insured Contact',
  policy_number: 'Policy Number',
  insurer_email: 'Insurer Email',
  claims_technician: 'Claims Technician',
  assessment_location: 'Area / Location',
  cover_type: 'Cover Type',
  excess_amount: 'Excess Amount',
  excess_note: 'Excess Note',
  primary_use: 'Primary Use',
  vehicle_make: 'Vehicle Make',
  vehicle_model: 'Vehicle Model',
  vehicle_year: 'Year',
  vehicle_reg: 'Registration',
  vehicle_vin: 'VIN',
  vehicle_engine_number: 'Engine Number',
  vehicle_mm_code: 'MM Code',
  vehicle_colour: 'Colour',
  repairer_name: 'Repairer Name',
  repairer_contact: 'Repairer Contact',
  repairer_email: 'Repairer Email',
  quoted_total: 'Quoted Total (R)',
  parts_supplier: 'Parts Supplier',
  parts_total: 'Parts Total (R)',
  retail_value: 'Retail Value (R)',
  trade_value: 'Trade Value (R)',
  market_value: 'Market Value (R)',
  new_price: 'New Price (R)',
  valuation_date: 'Valuation Date',
  mm_code_valuation: 'MM Code',
}

const CONFIDENCE_CONFIG: Record<FieldConfidence, { label: string; className: string; dotClass: string }> = {
  high:      { label: 'High',      className: 'bg-emerald-50 border-emerald-200 text-emerald-800', dotClass: 'bg-emerald-500' },
  medium:    { label: 'Medium',    className: 'bg-amber-50 border-amber-200 text-amber-800',       dotClass: 'bg-amber-500'   },
  low:       { label: 'Low',       className: 'bg-red-50 border-red-200 text-red-700',             dotClass: 'bg-red-400'     },
  not_found: { label: 'Not found', className: 'bg-gray-50 border-gray-200 text-gray-500',          dotClass: 'bg-gray-300'    },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  motor_assessment_instruction: 'Motor Assessment Instruction',
  repairer_quote: 'Repairer / Labour Quote',
  parts_quote: 'Parts Quotation',
  mm_valuation: 'MM Codes / Valuation',
  unknown: 'Unknown Document',
}

function FieldRow({
  fieldKey,
  field,
  value,
  onChange,
}: {
  fieldKey: string
  field: ExtractedField
  value: string
  onChange: (v: string) => void
}) {
  const conf = field.confidence in CONFIDENCE_CONFIG ? field.confidence : 'not_found'
  const config = CONFIDENCE_CONFIG[conf as FieldConfidence]

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`} />
          <span className="text-xs font-medium text-charcoal">
            {FIELD_LABELS[fieldKey as keyof ExtractionResult] ?? fieldKey}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${config.className}`}>
            {config.label}
          </span>
          {field.is_pii && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              PII — local only
            </span>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.confidence === 'not_found' ? 'Not found — enter manually' : ''}
          className="w-full px-2.5 py-1.5 border border-[#D4CFC7] rounded-md text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper bg-white"
        />
        {field.context && (
          <p className="text-xs text-slate/70 mt-1 truncate" title={field.context}>{field.context}</p>
        )}
      </div>
    </div>
  )
}

export function ExtractionReviewPanel({ result, onConfirm, onCancel }: Props) {
  const [showAdditional, setShowAdditional] = useState(false)

  // Build initial editable values from extracted fields
  const buildInitialValues = (): Record<string, string> => {
    const vals: Record<string, string> = {}
    for (const key of Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]) {
      const field = result[key] as ExtractedField | undefined
      if (field) vals[key as string] = field.value ?? ''
    }
    return vals
  }

  const [values, setValues] = useState(buildInitialValues)

  const setField = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }))

  const handleAcceptAll = () => {
    const updated: Record<string, string> = {}
    for (const [k, field] of Object.entries(result)) {
      if (field && typeof field === 'object' && 'value' in field && field.value !== null) {
        updated[k] = String(field.value)
      }
    }
    setValues((v) => ({ ...v, ...updated }))
  }

  const handleClearAll = () => {
    setValues(Object.fromEntries(Object.keys(values).map((k) => [k, ''])))
  }

  const handleConfirm = () => {
    const confirmed: ConfirmedFields = {}
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) {
        ;(confirmed as any)[k] = v.trim()
      }
    }
    onConfirm(confirmed)
  }

  // Only show fields that are in the result
  const presentFields = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter(
    (k) => result[k] !== undefined
  )

  const highCount = presentFields.filter((k) => (result[k] as ExtractedField)?.confidence === 'high').length
  const mediumCount = presentFields.filter((k) => (result[k] as ExtractedField)?.confidence === 'medium').length
  const lowCount = presentFields.filter((k) => (result[k] as ExtractedField)?.confidence === 'low').length

  const docTypeConf = CONFIDENCE_CONFIG[result.document_type_confidence as FieldConfidence] ?? CONFIDENCE_CONFIG.low

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-charcoal">Extraction Review</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${docTypeConf.className}`}>
              {DOC_TYPE_LABELS[result.document_type] ?? result.document_type}
            </span>
            <span className="text-xs text-slate">
              {highCount} high · {mediumCount} medium · {lowCount} low confidence
            </span>
          </div>
        </div>
        <button onClick={onCancel} className="p-1 text-slate/40 hover:text-slate transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAcceptAll}
          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Accept All
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs px-3 py-1.5 border border-[#D4CFC7] text-slate rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {presentFields.map((key) => {
          const field = result[key] as ExtractedField
          return (
            <FieldRow
              key={key as string}
              fieldKey={key as string}
              field={field}
              value={values[key as string] ?? ''}
              onChange={(v) => setField(key as string, v)}
            />
          )
        })}

        {/* Additional / unmapped fields */}
        {result.additional_fields && Object.keys(result.additional_fields).length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAdditional((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate hover:text-charcoal py-1"
            >
              {showAdditional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {Object.keys(result.additional_fields).length} additional fields found
            </button>
            {showAdditional && (
              <div className="space-y-2 mt-1">
                {Object.entries(result.additional_fields).map(([k, field]) => (
                  <div key={k} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-medium text-slate mb-0.5">{k}</p>
                    <p className="text-sm text-charcoal">{field.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-[#D4CFC7]">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Apply to Form
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
