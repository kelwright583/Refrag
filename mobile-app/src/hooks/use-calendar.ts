/**
 * Calendar hooks for mobile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/calendar'
import { BlockType } from '@/lib/types/calendar'

export function useCalendarBlocks(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar-blocks', from, to],
    queryFn: () => api.getCalendarBlocks(from, to),
    enabled: !!from && !!to,
  })
}

export function useCalendarAppointments(from: string, to: string) {
  return useQuery({
    queryKey: ['calendar-appointments', from, to],
    queryFn: () => api.getCalendarAppointments(from, to),
    enabled: !!from && !!to,
  })
}

export function useCreateCalendarBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { block_type: BlockType; title?: string; starts_at: string; ends_at: string; notes?: string }) =>
      api.createCalendarBlock(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
    },
  })
}

export function useDeleteCalendarBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCalendarBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
    },
  })
}
