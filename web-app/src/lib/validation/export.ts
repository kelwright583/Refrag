/**
 * Export validation schemas
 */

import { z } from 'zod'

export const exportTypeSchema = z.enum(['assessor_pack'])

export const createExportSchema = z.object({
  case_id: z.string().uuid(),
  report_id: z.string().uuid().optional(),
  assessment_id: z.string().uuid().optional(),
  export_type: exportTypeSchema.default('assessor_pack'),
})
