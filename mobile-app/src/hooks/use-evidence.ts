/**
 * React Query hooks for evidence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEvidence,
  getSignedUrl,
  getSignedUrls,
  createEvidence,
  deleteEvidence,
  addEvidenceTags,
  removeEvidenceTag,
} from '@/lib/api/evidence';
import { EvidenceWithTags, CreateEvidenceInput } from '@/lib/types/evidence';

export function useEvidence(caseId: string) {
  return useQuery({
    queryKey: ['evidence', caseId],
    queryFn: () => getEvidence(caseId),
    enabled: !!caseId,
  });
}

export function useSignedUrl(storagePath: string | undefined) {
  return useQuery({
    queryKey: ['signed-url', storagePath],
    queryFn: () => getSignedUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 50 * 60 * 1000,
  });
}

/** Batch-fetch signed URLs for all photo evidence in one request. */
export function useEvidenceSignedUrls(evidence: EvidenceWithTags[] | undefined) {
  const photoPaths = (evidence ?? [])
    .filter((e) => e.media_type === 'photo' && e.storage_path)
    .map((e) => e.storage_path);

  const cacheKey = photoPaths.slice().sort().join(',');

  return useQuery({
    queryKey: ['signed-urls', cacheKey],
    queryFn: () => getSignedUrls(photoPaths),
    enabled: photoPaths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
}

export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEvidenceInput) => createEvidence(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.case_id] });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, caseId }: { evidenceId: string; caseId: string }) =>
      deleteEvidence(evidenceId, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] });
    },
  });
}

export function useAddEvidenceTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      tags,
      caseId,
    }: {
      evidenceId: string;
      tags: string[];
      caseId: string;
    }) => addEvidenceTags(evidenceId, tags, caseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] });
    },
  });
}

export function useRemoveEvidenceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, tag, caseId }: { evidenceId: string; tag: string; caseId: string }) =>
      removeEvidenceTag(evidenceId, tag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evidence', variables.caseId] });
    },
  });
}
