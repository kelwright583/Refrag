'use client'

import { Car } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function VehicleSummarySection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Car className="w-4 h-4" />
        <span className="text-sm">Vehicle / risk item summary</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Vehicle summary will be rendered here</p>
      </div>
    </div>
  )
}
