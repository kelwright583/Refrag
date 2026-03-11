'use client'

import { useMutation } from '@tanstack/react-query'
import { ingestDocument } from '@/lib/api/ingestion'
import type { DocumentIngestionInput, ExtractionResult } from '@/lib/types/ingestion'

export function useIngestDocument() {
  return useMutation<ExtractionResult, Error, DocumentIngestionInput>({
    mutationFn: (input) => ingestDocument(input),
  })
}
