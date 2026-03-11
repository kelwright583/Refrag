/**
 * Case number generation utilities
 */

import { useOrgStore } from '@/store/org';

/**
 * Generate a case number in format: ORGSLUG-YYYY-0001
 */
export function generateCaseNumber(orgSlug: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${orgSlug.toUpperCase()}-${year}-${random}`;
}

/**
 * Generate a temporary case number (client-side)
 * Final case number will be set by server
 */
export function generateTempCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TEMP-${year}-${random}`;
}
