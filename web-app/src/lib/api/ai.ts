/**
 * AI API client functions
 */

export interface ClassifyEvidenceResult {
  category: string
  label: string
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

export interface DamageSeverityResult {
  severity: 'minor' | 'moderate' | 'severe' | 'total_loss'
  affected_area: string
  estimated_repair_type: string
  notes: string
  flags: string[]
}

export interface CheckReportResult {
  completeness_score: number
  status: 'complete' | 'needs_attention' | 'incomplete'
  missing_sections: string[]
  suggestions: string[]
  flags: string[]
}

export async function classifyEvidence(input: {
  evidence_id?: string
  case_id?: string
  image_url: string
}): Promise<ClassifyEvidenceResult> {
  const res = await fetch('/api/ai/classify-evidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to classify evidence')
  }
  return res.json()
}

export async function assessDamageSeverity(input: {
  evidence_id?: string
  case_id?: string
  image_url: string
}): Promise<DamageSeverityResult> {
  const res = await fetch('/api/ai/damage-severity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to assess damage')
  }
  return res.json()
}

export async function checkReport(input: {
  case_id?: string
  report_text: string
  report_type?: 'motor' | 'property' | 'general'
  known_pii?: Record<string, string>
}): Promise<CheckReportResult> {
  const res = await fetch('/api/ai/check-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to check report')
  }
  return res.json()
}
