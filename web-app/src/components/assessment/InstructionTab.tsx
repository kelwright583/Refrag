'use client'

import { useState } from 'react'
import { useUpdateAssessment } from '@/hooks/use-assessments'
import { Field, Section, Input, Select, Textarea, SaveBar } from './shared'
import type { FullMotorAssessment } from '@/lib/types/assessment'
import { DocumentDropZone } from '@/components/ingestion/DocumentDropZone'
import { ExtractionReviewPanel } from '@/components/ingestion/ExtractionReviewPanel'
import type { ExtractionResult, ConfirmedFields } from '@/lib/types/ingestion'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

export function InstructionTab({ assessment, onNavigate }: Props) {
  const updateAssessment = useUpdateAssessment(assessment.id)
  const [saved, setSaved] = useState(false)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)

  const [form, setForm] = useState({
    insurer_name: assessment.insurer_name ?? '',
    insurer_email: assessment.insurer_email ?? '',
    claim_number: assessment.claim_number ?? '',
    date_of_loss: assessment.date_of_loss ?? '',
    claims_technician: assessment.claims_technician ?? '',
    insured_name: assessment.insured_name ?? '',
    insured_contact: assessment.insured_contact ?? '',
    policy_number: assessment.policy_number ?? '',
    assessor_name: assessment.assessor_name ?? '',
    assessor_contact: assessment.assessor_contact ?? '',
    date_assessed: assessment.date_assessed ?? '',
    assessment_location: assessment.assessment_location ?? '',
    assessment_type: assessment.assessment_type,
    vehicle_stripped: assessment.vehicle_stripped,
  })

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    await updateAssessment.mutateAsync(form)
    setSaved(true)
  }

  /** Convert loose date string to YYYY-MM-DD for HTML date input */
  function formatDateForInput(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return raw
  }

  const handleExtractionConfirm = (fields: ConfirmedFields) => {
    setForm((f) => ({
      ...f,
      insurer_name: fields.insurer_name ?? f.insurer_name,
      insurer_email: fields.insurer_email ?? f.insurer_email,
      claim_number: fields.claim_reference ?? f.claim_number,
      date_of_loss: fields.loss_date ? formatDateForInput(fields.loss_date) : f.date_of_loss,
      claims_technician: fields.claims_technician ?? f.claims_technician,
      insured_name: fields.insured_name ?? f.insured_name,
      insured_contact: fields.insured_contact ?? f.insured_contact,
      policy_number: fields.policy_number ?? f.policy_number,
      assessment_location: fields.assessment_location ?? f.assessment_location,
    }))
    setSaved(false)
    setExtractionResult(null)
  }

  return (
    <div className="space-y-5">
      {/* --- Document Ingestion Drop Zone --- */}
      <Section title="Auto-populate from Instruction Document">
        {!extractionResult ? (
          <DocumentDropZone
            label="Drop assessment instruction (PDF, Word, email text) to auto-fill fields below"
            context={{ assessment_id: assessment.id }}
            onExtracted={(result) => setExtractionResult(result)}
          />
        ) : (
          <ExtractionReviewPanel
            result={extractionResult}
            onConfirm={handleExtractionConfirm}
            onCancel={() => setExtractionResult(null)}
          />
        )}
      </Section>

      {/* Insurer & Claim */}
      <Section title="Instruction Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Insurer Name">
            <Input value={form.insurer_name} onChange={(e) => set('insurer_name', e.target.value)} placeholder="e.g. Santam, OUTsurance" />
          </Field>
          <Field label="Insurer Email">
            <Input type="email" value={form.insurer_email} onChange={(e) => set('insurer_email', e.target.value)} />
          </Field>
          <Field label="Claim Number">
            <Input value={form.claim_number} onChange={(e) => set('claim_number', e.target.value)} />
          </Field>
          <Field label="Date of Loss">
            <Input type="date" value={form.date_of_loss} onChange={(e) => set('date_of_loss', e.target.value)} />
          </Field>
          <Field label="Claims Technician">
            <Input value={form.claims_technician} onChange={(e) => set('claims_technician', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Insured */}
      <Section title="Insured Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Insured Name">
            <Input value={form.insured_name} onChange={(e) => set('insured_name', e.target.value)} />
          </Field>
          <Field label="Insured Contact Number">
            <Input value={form.insured_contact} onChange={(e) => set('insured_contact', e.target.value)} />
          </Field>
          <Field label="Policy Number">
            <Input value={form.policy_number} onChange={(e) => set('policy_number', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Assessor */}
      <Section title="Assessment Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Assessor Name">
            <Input value={form.assessor_name} onChange={(e) => set('assessor_name', e.target.value)} />
          </Field>
          <Field label="Assessor Contact">
            <Input value={form.assessor_contact} onChange={(e) => set('assessor_contact', e.target.value)} />
          </Field>
          <Field label="Date Assessed">
            <Input type="date" value={form.date_assessed} onChange={(e) => set('date_assessed', e.target.value)} />
          </Field>
          <Field label="Assessment Location">
            <Input value={form.assessment_location} onChange={(e) => set('assessment_location', e.target.value)} placeholder="Workshop, site, roadside…" />
          </Field>
          <Field label="Assessment Type">
            <Select value={form.assessment_type} onChange={(e) => set('assessment_type', e.target.value)}>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="desktop">Desktop</option>
            </Select>
          </Field>
          <Field label="Vehicle Stripped?">
            <Select value={form.vehicle_stripped ? 'yes' : 'no'} onChange={(e) => set('vehicle_stripped', e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes — stripped for inspection</option>
            </Select>
          </Field>
        </div>
      </Section>

      <SaveBar
        onSave={handleSave}
        isSaving={updateAssessment.isPending}
        saved={saved}
        onNext={() => onNavigate('vehicle')}
        nextLabel="Vehicle Details"
      />
    </div>
  )
}
