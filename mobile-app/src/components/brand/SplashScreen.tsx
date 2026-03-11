/**
 * In-app splash: REFRAG title, actual logo from brand folder, subtitle in Anek Bangla beneath the logo.
 * Uses RefragLogo (RefragLogoIcon.png), not the doc logo.
 */

import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { RefragLogo } from './RefragLogo';
import { typography } from '@/lib/theme/typography';
import { colors } from '@/lib/theme/colors';

export function SplashScreen() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.9, 420);
  const logoHeight = logoWidth * (108 / 360);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REFRAG</Text>
      <RefragLogo width={logoWidth} height={logoHeight} />
      <Text style={styles.subtitle}>FROM EVIDENCE TO OUTCOME</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: typography.fonts.heading,
    fontSize: 52,
    letterSpacing: 2,
    color: colors.slate,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: typography.fonts.subtitle,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.muted,
    marginTop: 18,
  },
});
