/**
 * Mock data for mobile - matches Case type
 */

import { Case } from '@/lib/types/case'

const mockUser = { id: 'mock-user-id' }
const mockOrg = { id: 'mock-org-id' }

export const mockCases: Case[] = [
  {
    id: 'case-1',
    org_id: mockOrg.id,
    created_by: mockUser.id,
    case_number: 'TEST-ORG-2024-0001',
    client_name: 'John Doe',
    insurer_name: 'Test Insurance Co',
    broker_name: 'Test Broker',
    claim_reference: 'CLM-12345',
    loss_date: '2024-01-15',
    location: '123 Main St, City',
    status: 'assigned',
    priority: 'high',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
  },
  {
    id: 'case-2',
    org_id: mockOrg.id,
    created_by: mockUser.id,
    case_number: 'TEST-ORG-2024-0002',
    client_name: 'Jane Smith',
    insurer_name: null,
    broker_name: null,
    claim_reference: 'CLM-12346',
    loss_date: null,
    location: null,
    status: 'draft',
    priority: 'normal',
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-12T09:00:00Z',
  },
  {
    id: 'case-3',
    org_id: mockOrg.id,
    created_by: mockUser.id,
    case_number: 'TEST-ORG-2024-0003',
    client_name: 'Bob Johnson',
    insurer_name: 'Another Insurance',
    broker_name: null,
    claim_reference: 'CLM-12347',
    loss_date: '2023-12-20',
    location: '456 Oak Ave, City',
    status: 'closed',
    priority: 'low',
    created_at: '2023-12-18T11:00:00Z',
    updated_at: '2024-01-05T16:00:00Z',
  },
]
