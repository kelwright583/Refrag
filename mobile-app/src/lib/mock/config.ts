/**
 * Mock mode - Production kill switch
 *
 * Set EXPO_PUBLIC_MOCK_MODE_ENABLED=false (or omit) to disable.
 * In production builds, do not set this variable.
 */

const MOCK_ENV =
  typeof process !== 'undefined' &&
  process.env?.EXPO_PUBLIC_MOCK_MODE_ENABLED === 'true'

export const MOCK_MODE_AVAILABLE = MOCK_ENV

export type MockDataType = 'cases'

export interface MockToggles {
  cases: boolean
}

export const defaultToggles: MockToggles = {
  cases: false,
}
