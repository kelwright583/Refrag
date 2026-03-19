'use client'

import { Users } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function PartiesSummarySection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Users className="w-4 h-4" />
        <span className="text-sm">Involved parties</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Parties summary will be rendered here</p>
      </div>
    </div>
  )
}
