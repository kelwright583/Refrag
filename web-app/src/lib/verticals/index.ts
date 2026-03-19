export {
  VERTICAL_CONFIGS,
  VERTICAL_IDS,
  type VerticalId,
  type VerticalConfig,
  type SectionKey,
  type ReportSectionTemplate,
} from './config'

import { VERTICAL_CONFIGS, type VerticalConfig, type VerticalId, type SectionKey } from './config'

export function getVerticalConfig(verticalId: string): VerticalConfig {
  const config = VERTICAL_CONFIGS[verticalId as VerticalId]
  if (!config) {
    return VERTICAL_CONFIGS.general
  }
  return config
}

export function getTerminology(verticalId: string): VerticalConfig['terminology'] {
  return getVerticalConfig(verticalId).terminology
}

export function getSections(
  verticalId: string,
  tab: keyof VerticalConfig['sections'],
): SectionKey[] {
  return getVerticalConfig(verticalId).sections[tab]
}
