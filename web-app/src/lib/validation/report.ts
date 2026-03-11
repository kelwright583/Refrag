/**
 * Report validation schemas
 */

import { z } from 'zod'

export const reportStatusSchema = z.enum(['draft', 'ready', 'submitted'])

export const createReportSchema = z.object({
  case_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
})

export const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: reportStatusSchema.optional(),
})

export const createReportSectionSchema = z.object({
  report_id: z.string().uuid(),
  section_key: z.string().min(1, 'Section key is required'),
  heading: z.string().min(1, 'Heading is required'),
  body_md: z.string().default(''),
  order_index: z.number().int().min(0).default(0),
})

export const updateReportSectionSchema = z.object({
  heading: z.string().min(1).optional(),
  body_md: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
})

export const reorderSectionsSchema = z.object({
  section_orders: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int().min(0),
    })
  ),
})
