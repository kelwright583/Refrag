'use client'

import { Circle } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function TyreGridSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Circle className="w-4 h-4" />
        <span className="text-sm">Tyre assessment grid</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Tyre assessment grid will be rendered here</p>
      </div>
    </div>
  )
}
