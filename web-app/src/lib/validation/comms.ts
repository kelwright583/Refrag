/**
 * Communications validation schemas
 */

import { z } from 'zod'

export const commsChannelSchema = z.enum(['email', 'note'])

export const createCommsTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject_template: z.string().min(1, 'Subject template is required'),
  body_template_md: z.string().min(1, 'Body template is required'),
})

export const updateCommsTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject_template: z.string().min(1).optional(),
  body_template_md: z.string().min(1).optional(),
})

export const createCommsLogSchema = z.object({
  case_id: z.string().uuid(),
  channel: commsChannelSchema,
  to_recipients: z.string().optional(),
  subject: z.string().optional(),
  body_md: z.string().min(1, 'Body is required'),
})
