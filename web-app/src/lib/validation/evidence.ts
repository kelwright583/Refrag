/**
 * Evidence validation schemas
 */

import { z } from 'zod'

export const createEvidenceSchema = z.object({
  case_id: z.string().uuid(),
  storage_path: z.string().min(1),
  media_type: z.enum(['photo', 'video', 'document']),
  content_type: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().positive(),
  captured_at: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const updateEvidenceSchema = z.object({
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})
