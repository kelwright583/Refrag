import type {
  ReportPack,
  ReportPackWithItems,
  ReportPackItem,
  CreateReportPackInput,
  UpdateReportPackInput,
  CreateReportPackItemInput,
  UpdateReportPackItemInput,
} from '@/lib/types/report-pack'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

export async function getReportPacksForCase(caseId: string): Promise<ReportPack[]> {
  return apiFetch(`/api/report-packs?caseId=${caseId}`)
}

export async function getReportPack(packId: string): Promise<ReportPackWithItems> {
  return apiFetch(`/api/report-packs/${packId}`)
}

export async function createReportPack(input: CreateReportPackInput): Promise<ReportPack> {
  return apiFetch('/api/report-packs', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateReportPack(packId: string, input: UpdateReportPackInput): Promise<ReportPack> {
  return apiFetch(`/api/report-packs/${packId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function deleteReportPack(packId: string): Promise<void> {
  await apiFetch(`/api/report-packs/${packId}`, { method: 'DELETE' })
}

export async function addReportPackItem(packId: string, input: CreateReportPackItemInput): Promise<ReportPackItem> {
  return apiFetch(`/api/report-packs/${packId}/items`, { method: 'POST', body: JSON.stringify(input) })
}

export async function updateReportPackItem(
  packId: string,
  itemId: string,
  input: UpdateReportPackItemInput
): Promise<ReportPackItem> {
  return apiFetch(`/api/report-packs/${packId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteReportPackItem(packId: string, itemId: string): Promise<void> {
  await apiFetch(`/api/report-packs/${packId}/items/${itemId}`, { method: 'DELETE' })
}
