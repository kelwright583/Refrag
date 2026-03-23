/**
 * Create case modal - with primary risk item and vertical selection
 */

'use client'

import { useState, useEffect } from 'react'
import { useCreateCase } from '@/hooks/use-cases'
import { useCreateRiskItem } from '@/hooks/use-risk-items'
import { useClients } from '@/hooks/use-clients'
import { createCaseSchema } from '@/lib/validation/case'
import { RiskType, RISK_TYPE_LABELS, COVER_TYPE_LABELS, CoverType } from '@/lib/types/risk-item'
import { DocumentDropZone } from '@/components/ingestion/DocumentDropZone'
import { ExtractionReviewPanel } from '@/components/ingestion/ExtractionReviewPanel'
import type { ExtractionResult, ConfirmedFields } from '@/lib/types/ingestion'
import type { VerticalId } from '@/lib/verticals/config'

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#30313A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

interface CreateCaseModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  isLoading?: boolean
  /** Pre-select a vertical (e.g. from org specialisation). If provided, the
   *  vertical selector still appears so the user can change it. */
  defaultVertical?: VerticalId
}

const VERTICAL_OPTIONS: { value: VerticalId; label: string }[] = [
  { value: 'motor_assessor', label: 'Motor Assessor' },
  { value: 'property_assessor', label: 'Property Assessor' },
  { value: 'loss_adjuster', label: 'Loss Adjuster' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'general', label: 'General' },
]

const REFERRAL_SOURCE_OPTIONS = [
  'Insurer',
  'SIU',
  'Attorney',
  'Broker',
  'Corporate',
  'Other',
]

const CONFIDENTIALITY_OPTIONS = [
  'Standard',
  'Confidential',
  'Strictly Confidential',
]

const INITIAL_FORM = {
  client_id: '',
  client_name: '',
  insurer_name: '',
  broker_name: '',
  claim_reference: '',
  insurer_reference: '',
  loss_date: '',
  location: '',
  priority: 'normal' as 'low' | 'normal' | 'high',
  vertical: '' as VerticalId | '',
}

const INITIAL_RISK = {
  risk_type: '' as RiskType | '',
  cover_type: '' as CoverType | '',
  description: '',
  // Motor fields
  vin: '',
  registration: '',
  make: '',
  model: '',
  year: '',
  engine_number: '',
  // Property fields
  property_address: '',
  erf_number: '',
  property_type: '',
  // Generic fields
  estimated_value: '',
}

const INITIAL_INVESTIGATOR = {
  referral_source: '',
  nature_of_referral: '',
  mandate_questions: '',
  subject_name: '',
  subject_id_number: '',
  subject_relationship: '',
  confidentiality_level: 'Standard',
}

async function saveReferralDetailsNote(
  caseId: string,
  data: typeof INITIAL_INVESTIGATOR,
) {
  await fetch(`/api/cases/${caseId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note_type: 'referral_details',
      content: data,
    }),
  })
}

export function CreateCaseModal({
  visible,
  onClose,
  onSuccess,
  isLoading = false,
  defaultVertical,
}: CreateCaseModalProps) {
  const { data: clients } = useClients()
  const [formData, setFormData] = useState({ ...INITIAL_FORM, vertical: defaultVertical ?? '' as VerticalId | '' })
  const [riskData, setRiskData] = useState(INITIAL_RISK)
  const [investigatorData, setInvestigatorData] = useState(INITIAL_INVESTIGATOR)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const createCase = useCreateCase()
  const createRiskItem = useCreateRiskItem()

  // Reset when modal reopens
  useEffect(() => {
    if (visible) {
      setFormData({ ...INITIAL_FORM, vertical: defaultVertical ?? '' })
      setRiskData(INITIAL_RISK)
      setInvestigatorData(INITIAL_INVESTIGATOR)
      setErrors({})
      setExtractionResult(null)
    }
  }, [visible, defaultVertical])

  // When client selected from dropdown, fill client_name
  useEffect(() => {
    if (formData.client_id && clients) {
      const c = clients.find((x) => x.id === formData.client_id)
      if (c) setFormData((f) => ({ ...f, client_name: c.name }))
    }
  }, [formData.client_id, clients])

  /** Apply confirmed extraction fields to the form */
  const handleExtractionConfirm = (fields: ConfirmedFields) => {
    setFormData((f) => ({
      ...f,
      insurer_name: fields.insurer_name ?? f.insurer_name,
      broker_name: fields.broker_name ?? f.broker_name,
      claim_reference: fields.claim_reference ?? f.claim_reference,
      loss_date: fields.loss_date ? formatDateForInput(fields.loss_date) : f.loss_date,
      location: fields.assessment_location ?? f.location,
      // insured name goes to client_name if not already set
      client_name: f.client_name || fields.insured_name || f.client_name,
    }))
    if (riskData.risk_type === '' && fields.vehicle_make) {
      setRiskData((r) => ({
        ...r,
        risk_type: 'motor_vehicle',
        make: fields.vehicle_make ?? r.make,
        model: fields.vehicle_model ?? r.model,
        year: fields.vehicle_year ?? r.year,
        registration: fields.vehicle_reg ?? r.registration,
        vin: fields.vehicle_vin ?? r.vin,
        engine_number: fields.vehicle_engine_number ?? r.engine_number,
        cover_type: (fields.cover_type as CoverType) ?? r.cover_type,
      }))
    } else if (fields.vehicle_make) {
      setRiskData((r) => ({
        ...r,
        make: fields.vehicle_make ?? r.make,
        model: fields.vehicle_model ?? r.model,
        year: fields.vehicle_year ?? r.year,
        registration: fields.vehicle_reg ?? r.registration,
        vin: fields.vehicle_vin ?? r.vin,
        engine_number: fields.vehicle_engine_number ?? r.engine_number,
      }))
    }
    setExtractionResult(null)
  }

  /** Convert loose date string to YYYY-MM-DD for HTML date input */
  function formatDateForInput(raw: string): string {
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    // DD/MM/YYYY
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return raw
  }

  const buildAssetData = () => {
    const rt = riskData.risk_type
    if (rt === 'motor_vehicle') {
      const data: Record<string, unknown> = {}
      if (riskData.vin) data.vin = riskData.vin
      if (riskData.registration) data.registration = riskData.registration
      if (riskData.make) data.make = riskData.make
      if (riskData.model) data.model = riskData.model
      if (riskData.year) data.year = parseInt(riskData.year)
      if (riskData.engine_number) data.engine_number = riskData.engine_number
      return data
    }
    if (rt === 'building') {
      const data: Record<string, unknown> = {}
      if (riskData.property_address) data.address = riskData.property_address
      if (riskData.erf_number) data.erf_number = riskData.erf_number
      if (riskData.property_type) data.property_type = riskData.property_type
      return data
    }
    // Generic (contents, stock, business_interruption, goods_in_transit, other)
    const data: Record<string, unknown> = {}
    if (riskData.description) data.description = riskData.description
    if (riskData.estimated_value) data.estimated_value = parseFloat(riskData.estimated_value)
    return data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const payload = {
        client_id: formData.client_id || undefined,
        client_name: formData.client_name,
        insurer_name: formData.insurer_name || undefined,
        broker_name: formData.broker_name || undefined,
        claim_reference: formData.claim_reference || undefined,
        insurer_reference: formData.insurer_reference || undefined,
        loss_date: formData.loss_date || undefined,
        location: formData.location || undefined,
        priority: formData.priority,
        vertical: formData.vertical || undefined,
      }
      const validated = createCaseSchema.parse(payload)
      const newCase = await createCase.mutateAsync(validated)

      // Create primary risk item if risk type selected (not for investigator)
      if (riskData.risk_type && formData.vertical !== 'investigator') {
        await createRiskItem.mutateAsync({
          case_id: newCase.id,
          is_primary: true,
          risk_type: riskData.risk_type as RiskType,
          cover_type: riskData.cover_type || undefined,
          description: riskData.description || undefined,
          asset_data: buildAssetData(),
        })
      }

      // For investigator vertical, save referral details as a case note
      if (formData.vertical === 'investigator') {
        const hasAnyInvestigatorData =
          investigatorData.referral_source ||
          investigatorData.nature_of_referral ||
          investigatorData.mandate_questions ||
          investigatorData.subject_name ||
          investigatorData.subject_id_number ||
          investigatorData.subject_relationship
        if (hasAnyInvestigatorData) {
          await saveReferralDetailsNote(newCase.id, investigatorData)
        }
      }

      setFormData({ ...INITIAL_FORM, vertical: defaultVertical ?? '' })
      setRiskData(INITIAL_RISK)
      setInvestigatorData(INITIAL_INVESTIGATOR)
      setExtractionResult(null)
      onSuccess()
      onClose()
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          if (err.path) fieldErrors[err.path[0]] = err.message
        })
        setErrors(fieldErrors)
      } else {
        alert(error.message || 'Failed to create case')
      }
    }
  }

  if (!visible) return null

  const isPending = isLoading || createCase.isPending || createRiskItem.isPending
  const riskType = riskData.risk_type as RiskType | ''
  const isInvestigator = formData.vertical === 'investigator'

  const inputClass = 'w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted'
  const smallInputClass = 'w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted'

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D4CFC7]">
        <div className="flex items-center justify-between p-6 border-b border-[#D4CFC7]">
          <h2 className="text-xl font-heading font-bold text-slate">New Case</h2>
          <button onClick={onClose} className="text-muted hover:text-slate transition-colors p-1">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* --- Document Ingestion Drop Zone --- */}
          <div className="p-4 bg-[#F5F2EE] rounded-xl space-y-3">
            <p className="text-xs font-semibold text-slate uppercase tracking-wide">Auto-populate from document</p>
            {!extractionResult ? (
              <DocumentDropZone
                label="Drop assessment instruction, quote or other document to auto-fill fields"
                onExtracted={(result) => setExtractionResult(result)}
              />
            ) : (
              <ExtractionReviewPanel
                result={extractionResult}
                onConfirm={handleExtractionConfirm}
                onCancel={() => setExtractionResult(null)}
              />
            )}
          </div>

          {/* Vertical selector */}
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Vertical / Case Type</label>
            <select
              value={formData.vertical}
              onChange={(e) => setFormData({ ...formData, vertical: e.target.value as VerticalId | '' })}
              className={inputClass}
            >
              <option value="">Select vertical...</option>
              {VERTICAL_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Client selection */}
          {clients && clients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Client</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder={clients?.length ? 'Or type a new client' : 'e.g. ABC Insurance'}
              className={inputClass}
              required
            />
            {errors.client_name && <p className="text-sm text-red-600 mt-1">{errors.client_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Insurer / Client Reference</label>
            <input
              type="text"
              value={formData.insurer_reference}
              onChange={(e) => setFormData({ ...formData, insurer_reference: e.target.value })}
              placeholder="Their claim number"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Insurer</label>
              <input type="text" value={formData.insurer_name} onChange={(e) => setFormData({ ...formData, insurer_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Broker</label>
              <input type="text" value={formData.broker_name} onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Claim Reference</label>
            <input type="text" value={formData.claim_reference} onChange={(e) => setFormData({ ...formData, claim_reference: e.target.value })} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Loss Date</label>
              <input type="date" value={formData.loss_date} onChange={(e) => setFormData({ ...formData, loss_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' })} className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Location / Address</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Visit address" className={inputClass} />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Investigator-specific fields                                     */}
          {/* ---------------------------------------------------------------- */}
          {isInvestigator && (
            <div className="border-t border-[#D4CFC7] pt-5 space-y-4">
              <h3 className="text-sm font-heading font-bold text-slate">Investigation Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Referral Source</label>
                  <select
                    value={investigatorData.referral_source}
                    onChange={(e) => setInvestigatorData({ ...investigatorData, referral_source: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select source...</option>
                    {REFERRAL_SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Confidentiality Level</label>
                  <select
                    value={investigatorData.confidentiality_level}
                    onChange={(e) => setInvestigatorData({ ...investigatorData, confidentiality_level: e.target.value })}
                    className={inputClass}
                  >
                    {CONFIDENTIALITY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate mb-1">Nature of Referral</label>
                <input
                  type="text"
                  value={investigatorData.nature_of_referral}
                  onChange={(e) => setInvestigatorData({ ...investigatorData, nature_of_referral: e.target.value })}
                  placeholder="Brief description of the referral reason"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate mb-1">Specific Mandate Questions</label>
                <textarea
                  value={investigatorData.mandate_questions}
                  onChange={(e) => setInvestigatorData({ ...investigatorData, mandate_questions: e.target.value })}
                  rows={3}
                  placeholder="List the specific questions or mandate items to be addressed..."
                  className={`${inputClass} resize-y font-normal`}
                />
              </div>

              <div className="p-4 bg-[#F5F2EE] rounded-lg space-y-3">
                <p className="text-xs font-semibold text-slate uppercase tracking-wide">Subject Details (optional)</p>
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={investigatorData.subject_name}
                    onChange={(e) => setInvestigatorData({ ...investigatorData, subject_name: e.target.value })}
                    placeholder="Full name of primary subject"
                    className={smallInputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Subject ID Number</label>
                    <input
                      type="text"
                      value={investigatorData.subject_id_number}
                      onChange={(e) => setInvestigatorData({ ...investigatorData, subject_id_number: e.target.value })}
                      placeholder="ID / Passport number"
                      className={smallInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Relationship to Claim</label>
                    <input
                      type="text"
                      value={investigatorData.subject_relationship}
                      onChange={(e) => setInvestigatorData({ ...investigatorData, subject_relationship: e.target.value })}
                      placeholder="e.g. Claimant, Insured"
                      className={smallInputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Primary Risk Item Section (hidden for investigator vertical) --- */}
          {!isInvestigator && (
            <div className="border-t border-[#D4CFC7] pt-5">
              <h3 className="text-sm font-heading font-bold text-slate mb-3">Primary Risk Item</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Risk Type</label>
                  <select
                    value={riskData.risk_type}
                    onChange={(e) => setRiskData({ ...INITIAL_RISK, risk_type: e.target.value as RiskType | '', cover_type: riskData.cover_type, description: riskData.description })}
                    className={inputClass}
                  >
                    <option value="">Select risk type...</option>
                    {(Object.keys(RISK_TYPE_LABELS) as RiskType[]).map((rt) => (
                      <option key={rt} value={rt}>{RISK_TYPE_LABELS[rt]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Cover Type</label>
                  <select
                    value={riskData.cover_type}
                    onChange={(e) => setRiskData({ ...riskData, cover_type: e.target.value as CoverType | '' })}
                    className={inputClass}
                  >
                    <option value="">Select cover type...</option>
                    {(Object.keys(COVER_TYPE_LABELS) as CoverType[]).map((ct) => (
                      <option key={ct} value={ct}>{COVER_TYPE_LABELS[ct]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Motor vehicle fields */}
              {riskType === 'motor_vehicle' && (
                <div className="mt-3 space-y-3 p-3 bg-[#F5F2EE] rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Registration</label>
                      <input type="text" value={riskData.registration} onChange={(e) => setRiskData({ ...riskData, registration: e.target.value })} placeholder="e.g. CA 123-456" className={smallInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">VIN</label>
                      <input type="text" value={riskData.vin} onChange={(e) => setRiskData({ ...riskData, vin: e.target.value })} placeholder="17-character VIN" className={smallInputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Make</label>
                      <input type="text" value={riskData.make} onChange={(e) => setRiskData({ ...riskData, make: e.target.value })} className={smallInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Model</label>
                      <input type="text" value={riskData.model} onChange={(e) => setRiskData({ ...riskData, model: e.target.value })} className={smallInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Year</label>
                      <input type="number" value={riskData.year} onChange={(e) => setRiskData({ ...riskData, year: e.target.value })} placeholder="e.g. 2022" className={smallInputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Engine Number</label>
                    <input type="text" value={riskData.engine_number} onChange={(e) => setRiskData({ ...riskData, engine_number: e.target.value })} className={smallInputClass} />
                  </div>
                </div>
              )}

              {/* Building fields */}
              {riskType === 'building' && (
                <div className="mt-3 space-y-3 p-3 bg-[#F5F2EE] rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Property Address</label>
                    <input type="text" value={riskData.property_address} onChange={(e) => setRiskData({ ...riskData, property_address: e.target.value })} className={smallInputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Erf Number</label>
                      <input type="text" value={riskData.erf_number} onChange={(e) => setRiskData({ ...riskData, erf_number: e.target.value })} className={smallInputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate mb-1">Property Type</label>
                      <input type="text" value={riskData.property_type} onChange={(e) => setRiskData({ ...riskData, property_type: e.target.value })} placeholder="e.g. Residential" className={smallInputClass} />
                    </div>
                  </div>
                </div>
              )}

              {/* Generic fields (contents, stock, etc.) */}
              {riskType && riskType !== 'motor_vehicle' && riskType !== 'building' && (
                <div className="mt-3 space-y-3 p-3 bg-[#F5F2EE] rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Description</label>
                    <input type="text" value={riskData.description} onChange={(e) => setRiskData({ ...riskData, description: e.target.value })} placeholder="Describe the risk item" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Estimated Value</label>
                    <input type="number" value={riskData.estimated_value} onChange={(e) => setRiskData({ ...riskData, estimated_value: e.target.value })} className={smallInputClass} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#D4CFC7]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-muted hover:text-slate transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.client_name.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {isPending ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
