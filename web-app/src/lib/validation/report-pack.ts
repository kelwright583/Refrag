import { z } from 'zod'

const reportPackStatus = z.enum(['draft', 'ready', 'sent'])
const reportPackItemType = z.enum([
  'assessment_report',
  'mm_codes',
  'parts_quote',
  'labour_quote',
  'photos',
])

export const createReportPackSchema = z.object({
  case_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  title: z.string().optional(),
})

export const updateReportPackSchema = z.object({
  title: z.string().optional(),
  status: reportPackStatus.optional(),
  sent_to: z.string().optional(),
})

export const createReportPackItemSchema = z.object({
  item_type: reportPackItemType,
  assessment_document_id: z.string().uuid().optional(),
  evidence_id: z.string().uuid().optional(),
  included: z.boolean().optional().default(true),
  order_index: z.number().int().min(0).optional().default(0),
})

export const updateReportPackItemSchema = z.object({
  included: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
})
