/**
 * Evidence validation schemas using Zod
 */

import { z } from 'zod';

export const createEvidenceSchema = z.object({
  case_id: z.string().uuid(),
  storage_path: z.string().min(1),
  media_type: z.enum(['photo', 'video', 'document']),
  content_type: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().positive(),
  captured_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
