/**
 * Case validation schemas
 */

import { z } from 'zod';

export const createCaseSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  insurer_name: z.string().optional(),
  broker_name: z.string().optional(),
  claim_reference: z.string().optional(),
  insurer_reference: z.string().optional(),
  loss_date: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export const updateCaseSchema = createCaseSchema.partial();
