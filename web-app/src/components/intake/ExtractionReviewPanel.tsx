'use client'

import { useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import type { IntakeExtractionResult, IntakeExtractedField } from '@/app/api/intake/process/route'
import { getSchemaForRole } from '@/lib/intake/extraction-schemas'

interface Props {
  result: IntakeExtractionResult
  onConfirm: (fields: Record<string, string>) => void
  onReExtract?: () => void
  onCancel: () => void
}

const CONFIDENCE_STYLES: Record<
  string,
  { label: string; bg: string; dot: string }
> = {
  high: {
    label: 'High',
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-50 border-amber-200 text-amber-800',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    bg: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-400',
  },
}

function FieldRow({
  fieldKey,
  label,
  field,
  value,
  onChange,
}: {
  fieldKey: string
  label: string
  field: IntakeExtractedField
  value: string
  onChange: (v: string) => void
}) {
  const style = CONFIDENCE_STYLES[field.confidence] ?? CONFIDENCE_STYLES.low

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <span className="text-xs font-medium text-charcoal">{label}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full border ${style.bg}`}
          >
            {style.label}
          </span>
          {field.is_pii && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              <ShieldCheck className="w-3 h-3" />
              Local only — not sent to AI
            </span>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-[#D4CFC7] rounded-md text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper bg-white"
        />
        {field.source && (
          <p className="text-xs text-slate/60 mt-1 truncate" title={field.source}>
            Source: {field.source}
          </p>
        )}
      </div>
    </div>
  )
}

export function ExtractionReviewPanel({
  result,
  onConfirm,
  onReExtract,
  onCancel,
}: Props) {
  const schema = getSchemaForRole(result.document_role)
  const schemaMap = Object.fromEntries(schema.map((f) => [f.key, f]))
  const fields = result.extracted_fields

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const [key, field] of Object.entries(fields)) {
      initial[key] = field.value ?? ''
    }
    // Add empty entries for schema fields not in the result
    for (const s of schema) {
      if (!(s.key in initial)) {
        initial[s.key] = ''
      }
    }
    return initial
  })

  const [showEmpty, setShowEmpty] = useState(false)

  const setField = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }))

  const presentKeys = Object.keys(fields)
  const emptyKeys = schema
    .map((s) => s.key)
    .filter((k) => !presentKeys.includes(k))

  const counts = { high: 0, medium: 0, low: 0 }
  for (const f of Object.values(fields)) {
    if (f.confidence in counts) counts[f.confidence as keyof typeof counts]++
  }

  const handleConfirm = () => {
    const confirmed: Record<string, string> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) confirmed[k] = v.trim()
    }
    onConfirm(confirmed)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-charcoal">Extraction Review</h3>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full border bg-copper/10 border-copper/30 text-copper font-medium">
              {result.document_role.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate">
              {counts.high} high · {counts.medium} medium · {counts.low} low
            </span>
            <span className="text-xs text-slate/50">
              {result.extraction_method} · {result.processing_time_ms}ms
            </span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-slate/40 hover:text-slate transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Confirm &amp; Apply
        </button>
        {onReExtract && (
          <button
            type="button"
            onClick={onReExtract}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#D4CFC7] text-slate rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Re-extract
          </button>
        )}
      </div>

      {/* Present fields */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {presentKeys.map((key) => {
          const field = fields[key]
          const label = schemaMap[key]?.label ?? key.replace(/_/g, ' ')
          return (
            <FieldRow
              key={key}
              fieldKey={key}
              label={label}
              field={field}
              value={values[key] ?? ''}
              onChange={(v) => setField(key, v)}
            />
          )
        })}

        {/* Empty / unfound fields */}
        {emptyKeys.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowEmpty((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate hover:text-charcoal py-1"
            >
              {showEmpty ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {emptyKeys.length} fields not found — click to enter manually
            </button>
            {showEmpty && (
              <div className="space-y-2 mt-1">
                {emptyKeys.map((key) => {
                  const label =
                    schemaMap[key]?.label ?? key.replace(/_/g, ' ')
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-lg border bg-gray-50 border-gray-200"
                    >
                      <span className="text-xs font-medium text-slate mb-1 block">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={values[key] ?? ''}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder="Enter manually…"
                        className="w-full px-2.5 py-1.5 border border-[#D4CFC7] rounded-md text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper bg-white"
                      />
                    </div>
                  )
                })}
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
          Confirm &amp; Apply
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
