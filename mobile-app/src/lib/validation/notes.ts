/**
 * Notes validation schemas
 */

import { z } from 'zod';

export const createCaseNoteSchema = z.object({
  case_id: z.string().uuid(),
  body_md: z.string().min(1, 'Note cannot be empty'),
});

export const createCommsLogSchema = z.object({
  case_id: z.string().uuid(),
  channel: z.enum(['email', 'note']),
  body_md: z.string().min(1, 'Message cannot be empty'),
  to_recipients: z.string().optional(),
  subject: z.string().optional(),
});
