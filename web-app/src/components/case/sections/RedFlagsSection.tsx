'use client'

import { AlertTriangle } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function RedFlagsSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Red flags</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Red flags will be rendered here</p>
      </div>
    </div>
  )
}
