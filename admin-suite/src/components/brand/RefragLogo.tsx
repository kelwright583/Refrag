/**
 * Refrag logo and logo icon — single source for brand mark across the app.
 * Brand board: #30313A (charcoal), #C72A00 (accent)
 * In-app: actual logo = RefragLogoIcon.png (public). Doc icon = app tile/splash/favicon only.
 */

import Image from 'next/image'

const SLATE = '#30313A'
const ACCENT = '#C72A00'

interface RefragLogoProps {
  width?: number
  height?: number
  className?: string
}

/**
 * Full wordmark-style logo (5 rounded bars). Use in headers, login, marketing.
 */
export function RefragLogo({ width = 120, height = 32, className = '' }: RefragLogoProps) {
  const barWidth = width / 7
  const barHeight = height * 0.55
  const barHeightTall = height * 0.75
  const radius = barHeight / 2
  const radiusTall = barHeightTall / 2
  const gap = barWidth * 0.35

  const bars = [
    { x: 0, color: SLATE, h: barHeight, r: radius },
    { x: barWidth + gap, color: SLATE, h: barHeight, r: radius },
    { x: (barWidth + gap) * 2, color: SLATE, h: barHeightTall, r: radiusTall },
    { x: (barWidth + gap) * 3, color: ACCENT, h: barHeight, r: radius },
    { x: (barWidth + gap) * 4, color: ACCENT, h: barHeight, r: radius },
  ]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Refrag"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={(height - bar.h) / 2}
          width={barWidth}
          height={bar.h}
          rx={bar.r}
          ry={bar.r}
          fill={bar.color}
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
          }}
        />
      ))}
    </svg>
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
      src="/RefragLogoIcon.png"
      alt="Refrag"
      width={size}
      height={size}
      className={className}
      aria-label="Refrag"
    />
  )
}
