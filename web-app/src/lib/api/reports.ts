/**
 * Report API functions (client-side)
 */

import {
  Report,
  ReportWithSections,
  CreateReportInput,
  UpdateReportInput,
  ReportSection,
  CreateReportSectionInput,
  UpdateReportSectionInput,
  ReorderSectionsInput,
} from '@/lib/types/report'

/**
 * Get all reports for a case
 */
export async function getReports(caseId: string): Promise<Report[]> {
  const response = await fetch(`/api/cases/${caseId}/reports`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch reports')
  }

  return response.json()
}

/**
 * Get report by ID with sections
 */
export async function getReport(reportId: string): Promise<ReportWithSections> {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch report')
  }

  return response.json()
}

/**
 * Create a new report
 */
export async function createReport(
  caseId: string,
  input: CreateReportInput
): Promise<Report> {
  const response = await fetch(`/api/cases/${caseId}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create report')
  }

  return response.json()
}

/**
 * Update a report
 */
export async function updateReport(
  reportId: string,
  updates: UpdateReportInput
): Promise<Report> {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update report')
  }

  return response.json()
}

/**
 * Create a report section
 */
export async function createReportSection(
  reportId: string,
  input: CreateReportSectionInput
): Promise<ReportSection> {
  const response = await fetch(`/api/reports/${reportId}/sections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create section')
  }

  return response.json()
}

/**
 * Update a report section
 */
export async function updateReportSection(
  reportId: string,
  sectionId: string,
  updates: UpdateReportSectionInput
): Promise<ReportSection> {
  const response = await fetch(`/api/reports/${reportId}/sections/${sectionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update section')
  }

  return response.json()
}

/**
 * Delete a report section
 */
export async function deleteReportSection(
  reportId: string,
  sectionId: string
): Promise<void> {
  const response = await fetch(`/api/reports/${reportId}/sections/${sectionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete section')
  }
}

/**
 * Reorder report sections
 */
export async function reorderReportSections(
  reportId: string,
  input: ReorderSectionsInput
): Promise<void> {
  const response = await fetch(`/api/reports/${reportId}/sections/reorder`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reorder sections')
  }
}

/**
 * Check if report can be marked as ready
 */
export async function checkReportReady(caseId: string): Promise<{
  can_mark_ready: boolean
  message: string
  missing_count?: number
  total_count?: number
}> {
  const response = await fetch(`/api/cases/${caseId}/reports/check-ready`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to check report readiness')
  }

  return response.json()
}
