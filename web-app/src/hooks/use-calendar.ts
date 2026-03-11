/**
 * React Query hooks for calendar
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/calendar'
import { CreateCalendarBlockInput, UpdateCalendarBlockInput } from '@/lib/types/calendar'

const keys = {
  blocks: (from: string, to: string) => ['calendar-blocks', from, to] as const,
  appointments: (from: string, to: string) => ['calendar-appointments', from, to] as const,
}

export function useCalendarBlocks(from: string, to: string) {
  return useQuery({
    queryKey: keys.blocks(from, to),
    queryFn: () => api.getCalendarBlocks(from, to),
    enabled: !!from && !!to,
  })
}

export function useCalendarAppointments(from: string, to: string) {
  return useQuery({
    queryKey: keys.appointments(from, to),
    queryFn: () => api.getCalendarAppointments(from, to),
    enabled: !!from && !!to,
  })
}

export function useCreateCalendarBlock(from: string, to: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCalendarBlockInput) => api.createCalendarBlock(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
    },
  })
}

export function useUpdateCalendarBlock(from: string, to: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCalendarBlockInput }) =>
      api.updateCalendarBlock(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
    },
  })
}

export function useDeleteCalendarBlock(from: string, to: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCalendarBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] })
    },
  })
}
