/**
 * React Query hooks for case notes and comms log
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCaseNotes,
  createCaseNote,
  updateCaseNote,
  deleteCaseNote,
  getCommsLog,
  createCommsLogEntry,
} from '@/lib/api/notes';
import {
  CreateCaseNoteInput,
  CreateCommsLogInput,
} from '@/lib/types/notes';

export function useCaseNotes(caseId: string) {
  return useQuery({
    queryKey: ['case-notes', caseId],
    queryFn: () => getCaseNotes(caseId),
    enabled: !!caseId,
  });
}

export function useCreateCaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCaseNoteInput) => createCaseNote(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['case-notes', variables.case_id],
      });
    },
  });
}

export function useUpdateCaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, bodyMd }: { noteId: string; bodyMd: string }) =>
      updateCaseNote(noteId, bodyMd),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['case-notes'],
      });
    },
  });
}

export function useDeleteCaseNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteCaseNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['case-notes'],
      });
    },
  });
}

export function useCommsLog(caseId: string) {
  return useQuery({
    queryKey: ['comms-log', caseId],
    queryFn: () => getCommsLog(caseId),
    enabled: !!caseId,
  });
}

export function useCreateCommsLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommsLogInput) => createCommsLogEntry(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comms-log', variables.case_id],
      });
    },
  });
}
