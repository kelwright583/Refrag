/**
 * Typography tokens — Refrag brand
 * All text: Inter. Subtitles: Anek Bangla.
 * Use the font family names from @expo-google-fonts (loaded in root _layout).
 */

export const typography = {
  fonts: {
    /** Body / default text */
    body: 'Inter_400Regular',
    /** Headings */
    heading: 'Inter_700Bold',
    /** Subtitles — Anek Bangla */
    subtitle: 'AnekBangla_400Regular',
    /** Per-weight body fonts (use these when you need a specific weight) */
    bodyRegular: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
    subtitleRegular: 'AnekBangla_400Regular',
    subtitleMedium: 'AnekBangla_500Medium',
    subtitleSemiBold: 'AnekBangla_600SemiBold',
    subtitleBold: 'AnekBangla_700Bold',
  },
  /** Map weight key to Inter font family (for body text) */
  fontFamilyForWeight: {
    '400': 'Inter_400Regular',
    '500': 'Inter_500Medium',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
  } as const,
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
