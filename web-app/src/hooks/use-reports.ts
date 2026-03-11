/**
 * React Query hooks for reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReports,
  getReport,
  createReport,
  updateReport,
  createReportSection,
  updateReportSection,
  deleteReportSection,
  reorderReportSections,
  checkReportReady,
} from '@/lib/api/reports'
import {
  Report,
  ReportWithSections,
  CreateReportInput,
  UpdateReportInput,
  CreateReportSectionInput,
  UpdateReportSectionInput,
  ReorderSectionsInput,
} from '@/lib/types/report'

/**
 * Get all reports for a case
 */
export function useReports(caseId: string) {
  return useQuery({
    queryKey: ['reports', caseId],
    queryFn: () => getReports(caseId),
    enabled: !!caseId,
  })
}

/**
 * Get a single report with sections
 */
export function useReport(reportId: string) {
  return useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId,
  })
}

/**
 * Create a new report
 */
export function useCreateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, input }: { caseId: string; input: CreateReportInput }) =>
      createReport(caseId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.caseId] })
    },
  })
}

/**
 * Update a report
 */
export function useUpdateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, updates }: { reportId: string; updates: UpdateReportInput }) =>
      updateReport(reportId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report', data.id] })
      queryClient.invalidateQueries({ queryKey: ['reports', data.case_id] })
    },
  })
}

/**
 * Create a report section
 */
export function useCreateReportSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      reportId,
      input,
    }: {
      reportId: string
      input: CreateReportSectionInput
    }) => createReportSection(reportId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
    },
  })
}

/**
 * Update a report section
 */
export function useUpdateReportSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      reportId,
      sectionId,
      updates,
    }: {
      reportId: string
      sectionId: string
      updates: UpdateReportSectionInput
    }) => updateReportSection(reportId, sectionId, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
    },
  })
}

/**
 * Delete a report section
 */
export function useDeleteReportSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, sectionId }: { reportId: string; sectionId: string }) =>
      deleteReportSection(reportId, sectionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
    },
  })
}

/**
 * Reorder report sections
 */
export function useReorderReportSections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      reportId,
      input,
    }: {
      reportId: string
      input: ReorderSectionsInput
    }) => reorderReportSections(reportId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
    },
  })
}

/**
 * Check if report can be marked as ready
 */
export function useCheckReportReady(caseId: string) {
  return useQuery({
    queryKey: ['report-ready-check', caseId],
    queryFn: () => checkReportReady(caseId),
    enabled: !!caseId,
  })
}
