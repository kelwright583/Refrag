/**
 * Mock toggle store - persisted in AsyncStorage
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  MOCK_MODE_AVAILABLE,
  defaultToggles,
  type MockDataType,
  type MockToggles,
} from '@/lib/mock/config'

const STORAGE_KEY = 'refrag_mock_toggles'

type MockStore = {
  available: boolean
  toggles: MockToggles
  hydrated: boolean
  setEnabled: (type: MockDataType, enabled: boolean) => Promise<void>
  load: () => Promise<void>
}

export const useMockStore = create<MockStore>((set, get) => ({
  available: MOCK_MODE_AVAILABLE,
  toggles: defaultToggles,
  hydrated: false,
  setEnabled: async (type, enabled) => {
    const toggles = { ...get().toggles, [type]: enabled }
    set({ toggles })
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toggles))
    } catch (_) {}
  },
  load: async () => {
    try {
      const s = await AsyncStorage.getItem(STORAGE_KEY)
      const toggles = s
        ? { ...defaultToggles, ...JSON.parse(s) }
        : defaultToggles
      set({ toggles, hydrated: true })
    } catch (_) {
      set({ hydrated: true })
    }
  },
}))
