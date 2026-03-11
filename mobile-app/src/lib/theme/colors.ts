/**
 * Refrag Color Palette
 * Brand board: #30313A, #C72A00, #EAE4DC, #1F2933
 */

export const colors = {
  /** Dark blue/charcoal (primary text, headings) - #30313A */
  slate: '#30313A',
  /** Accent (CTAs, highlights) - #C72A00 */
  accent: '#C72A00',
  /** Text, headings - same as slate */
  charcoal: '#30313A',
  /** Secondary text */
  muted: '#6B7B86',
  white: '#FFFFFF',
  /** Page/screen background - brand light beige */
  background: '#EAE4DC',
  /** Borders on light backgrounds */
  border: '#D4CFC7',
  error: '#C53030',
  success: '#276749',
  /** Alias for accent - CTAs */
  copper: '#C72A00',
  /** Dark navy (dark surfaces, secondary dark) - #1F2933 */
  navy: '#1F2933',
} as const;

export type ColorKey = keyof typeof colors;

export { typography } from './typography';
