/**
 * Clients API - list clients for org
 */

import { supabase } from '@/lib/supabase/client';
import { Client } from '@/lib/types/client';

export async function getClients(orgId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) throw error;
  return data;
}
