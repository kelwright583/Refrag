/**
 * React Query hooks for clients
 */

import { useQuery } from '@tanstack/react-query';
import { getClients, getClient } from '@/lib/api/clients';
import { useOrgStore } from '@/store/org';

export function useClients() {
  const orgId = useOrgStore((s) => s.selectedOrgId);
  return useQuery({
    queryKey: ['clients', orgId],
    queryFn: () => getClients(orgId!),
    enabled: !!orgId,
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId!),
    enabled: !!clientId,
  });
}
