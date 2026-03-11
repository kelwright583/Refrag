/**
 * Refrag logo and logo icon — single source for brand mark across the app.
 * Uses the actual logo asset (RefragLogoIcon.png). Doc icon = app tile/splash/favicon only.
 */

import Image from 'next/image'
import refragLogoIconPng from './RefragLogoIcon.png'

interface RefragLogoProps {
  width?: number
  height?: number
  className?: string
}

/**
 * Full logo — actual Refrag logo image (RefragLogoIcon.png). Use in headers, login, marketing.
 */
export function RefragLogo({ width = 120, height = 32, className = '' }: RefragLogoProps) {
  return (
    <Image
      src={refragLogoIconPng}
      alt="Refrag"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
      aria-label="Refrag"
    />
  )
}

interface RefragLogoIconProps {
  size?: number
  className?: string
}

/**
 * Compact icon — actual Refrag logo (RefragLogoIcon.png). Use in nav, headers, small UI.
 */
export function RefragLogoIcon({ size = 24, className = '' }: RefragLogoIconProps) {
  return (
    <Image
      src={refragLogoIconPng}
      alt="Refrag"
      width={size}
      height={size}
      className={className}
      aria-label="Refrag"
    />
  )
}
