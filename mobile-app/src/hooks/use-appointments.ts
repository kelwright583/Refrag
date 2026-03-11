/**
 * React Query hooks for appointments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '@/lib/api/appointments';
import { useOrgStore } from '@/store/org';

export function useAppointments(options?: { from?: string; to?: string; caseId?: string }) {
  const orgId = useOrgStore((s) => s.selectedOrgId);
  return useQuery({
    queryKey: ['appointments', orgId, options?.from, options?.to, options?.caseId],
    queryFn: () => getAppointments(orgId!, options),
    enabled: !!orgId,
  });
}

/** Today's appointments - from midnight to end of day (local timezone) */
export function useTodayAppointments() {
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);
  return useAppointments({
    from: from.toISOString(),
    to: to.toISOString(),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { case_id: string; scheduled_at: string; address?: string; notes?: string }) =>
      createAppointment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { scheduled_at?: string; address?: string | null; notes?: string | null; completed_at?: string | null } }) =>
      updateAppointment(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['calendar-appointments'] });
    },
  });
}
