/**
 * Case validation schemas using Zod
 */

import { z } from 'zod';

export const createCaseSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  insurer_name: z.string().optional(),
  broker_name: z.string().optional(),
  claim_reference: z.string().optional(),
  loss_date: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export const updateCaseSchema = z.object({
  client_name: z.string().min(1).optional(),
  insurer_name: z.string().optional().nullable(),
  broker_name: z.string().optional().nullable(),
  claim_reference: z.string().optional().nullable(),
  loss_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
