'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReportPacksForCase,
  getReportPack,
  createReportPack,
  updateReportPack,
  deleteReportPack,
  addReportPackItem,
  updateReportPackItem,
  deleteReportPackItem,
} from '@/lib/api/report-packs'
import type {
  CreateReportPackInput,
  UpdateReportPackInput,
  CreateReportPackItemInput,
  UpdateReportPackItemInput,
} from '@/lib/types/report-pack'

export function useReportPacksForCase(caseId: string) {
  return useQuery({
    queryKey: ['report-packs', 'case', caseId],
    queryFn: () => getReportPacksForCase(caseId),
    enabled: !!caseId,
  })
}

export function useReportPack(packId: string) {
  return useQuery({
    queryKey: ['report-pack', packId],
    queryFn: () => getReportPack(packId),
    enabled: !!packId,
  })
}

export function useCreateReportPack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReportPackInput) => createReportPack(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-packs', 'case', data.case_id] })
    },
  })
}

export function useUpdateReportPack(packId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateReportPackInput) => updateReportPack(packId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-pack', packId] })
      queryClient.invalidateQueries({ queryKey: ['report-packs', 'case', data.case_id] })
    },
  })
}

export function useDeleteReportPack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (packId: string) => deleteReportPack(packId),
    onSuccess: (_, packId) => {
      queryClient.invalidateQueries({ queryKey: ['report-pack', packId] })
      queryClient.invalidateQueries({ queryKey: ['report-packs'] })
    },
  })
}

export function useAddReportPackItem(packId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReportPackItemInput) => addReportPackItem(packId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-pack', packId] })
    },
  })
}

export function useUpdateReportPackItem(packId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: UpdateReportPackItemInput }) =>
      updateReportPackItem(packId, itemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-pack', packId] })
    },
  })
}

export function useDeleteReportPackItem(packId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteReportPackItem(packId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-pack', packId] })
    },
  })
}
