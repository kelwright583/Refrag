'use client'

import { FileEdit } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function ReportBuilderSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <FileEdit className="w-4 h-4" />
        <span className="text-sm">Report builder</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Report builder will be fully built in Stage 5</p>
      </div>
    </div>
  )
}
