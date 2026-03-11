/**
 * Refrag logo and logo icon — single source for brand mark across the app.
 * Uses the actual logo asset (RefragLogoIcon.png). Doc icon (RefragDocIcon.png) = app tile/splash/favicon only.
 */

import { Image } from 'react-native';

const RefragLogoIconPng = require('./RefragLogoIcon.png');

interface RefragLogoProps {
  width?: number;
  height?: number;
}

/**
 * Full logo — actual Refrag logo image (RefragLogoIcon.png). Use in headers, login, splash, marketing.
 */
export function RefragLogo({ width = 120, height = 32 }: RefragLogoProps) {
  return (
    <Image
      source={RefragLogoIconPng}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Refrag"
    />
  );
}

interface RefragLogoIconProps {
  size?: number;
}

/**
 * Compact icon — same logo asset at small size. Use in tab bar, nav, small UI.
 */
export function RefragLogoIcon({ size = 24 }: RefragLogoIconProps) {
  return (
    <Image
      source={RefragLogoIconPng}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Refrag"
    />
  );
}
