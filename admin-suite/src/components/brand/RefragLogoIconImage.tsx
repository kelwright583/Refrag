/**
 * Refrag logo icon as image — actual logo (RefragLogoIcon.png). Use when you need the icon as a block element.
 */
'use client'

import Image from 'next/image'

interface RefragLogoIconImageProps {
  size?: number
  className?: string
}

export function RefragLogoIconImage({ size = 24, className = '' }: RefragLogoIconImageProps) {
  return (
    <Image
      src="/RefragLogoIcon.png"
      alt="Refrag"
      width={size}
      height={size}
      className={className}
    />
  )
}
