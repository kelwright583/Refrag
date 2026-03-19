/**
 * Locale-agnostic formatting utilities.
 * All formatting reads from org settings — never hardcoded to any country/currency.
 */

const DEFAULT_LOCALE = 'en'
const DEFAULT_CURRENCY = 'USD'

export function formatCurrency(
  amount: number | null | undefined,
  locale?: string,
  currencyCode?: string
): string {
  if (amount == null) return '-'
  const l = locale || DEFAULT_LOCALE
  const c = currencyCode || DEFAULT_CURRENCY
  try {
    return new Intl.NumberFormat(l, {
      style: 'currency',
      currency: c,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${c} ${amount.toFixed(2)}`
  }
}

export function formatNumber(
  value: number | null | undefined,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null) return '-'
  const l = locale || DEFAULT_LOCALE
  try {
    return new Intl.NumberFormat(l, options).format(value)
  } catch {
    return String(value)
  }
}

export function formatDate(
  date: string | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const l = locale || DEFAULT_LOCALE
  const defaultOpts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
  try {
    return d.toLocaleDateString(l, options || defaultOpts)
  } catch {
    return d.toISOString().split('T')[0]
  }
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const l = locale || DEFAULT_LOCALE
  const defaultOpts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
  try {
    return d.toLocaleString(l, options || defaultOpts)
  } catch {
    return d.toISOString()
  }
}

export function formatTime(
  date: string | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const l = locale || DEFAULT_LOCALE
  const defaultOpts: Intl.DateTimeFormatOptions = { timeStyle: 'short' }
  try {
    return d.toLocaleTimeString(l, options || defaultOpts)
  } catch {
    return d.toISOString().split('T')[1].slice(0, 5)
  }
}

export function getCurrencySymbol(locale?: string, currencyCode?: string): string {
  const l = locale || DEFAULT_LOCALE
  const c = currencyCode || DEFAULT_CURRENCY
  try {
    const parts = new Intl.NumberFormat(l, { style: 'currency', currency: c }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value || c
  } catch {
    return c
  }
}
