/**
 * Organisation store
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface OrgState {
  selectedOrgId: string | null;
  orgs: Org[];
  loading: boolean;
  setSelectedOrgId: (orgId: string | null) => Promise<void>;
  setOrgs: (orgs: Org[]) => void;
  setLoading: (loading: boolean) => void;
  loadSelectedOrg: () => Promise<void>;
}

const SELECTED_ORG_KEY = 'selected_org_id';

export const useOrgStore = create<OrgState>((set, get) => ({
  selectedOrgId: null,
  orgs: [],
  loading: false,
  
  setSelectedOrgId: async (orgId: string | null) => {
    if (orgId) {
      await SecureStore.setItemAsync(SELECTED_ORG_KEY, orgId);
    } else {
      await SecureStore.deleteItemAsync(SELECTED_ORG_KEY);
    }
    set({ selectedOrgId: orgId });
  },
  
  setOrgs: (orgs) => set({ orgs }),
  
  setLoading: (loading) => set({ loading }),
  
  loadSelectedOrg: async () => {
    try {
      const orgId = await SecureStore.getItemAsync(SELECTED_ORG_KEY);
      set({ selectedOrgId: orgId });
    } catch (error) {
      console.error('Error loading selected org:', error);
    }
  },
}));
