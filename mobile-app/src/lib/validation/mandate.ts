/**
 * Mandate validation schemas
 */

import { z } from 'zod';

export const assignMandateSchema = z.object({
  case_id: z.string().uuid(),
  mandate_id: z.string().uuid(),
});

export const updateRequirementCheckSchema = z.object({
  requirement_check_id: z.string().uuid(),
  status: z.enum(['missing', 'provided', 'not_applicable']).optional(),
  evidence_id: z.string().uuid().nullable().optional(),
  note: z.string().optional(),
});
