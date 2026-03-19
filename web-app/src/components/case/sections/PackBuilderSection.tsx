'use client'

import { FolderOpen } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function PackBuilderSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <FolderOpen className="w-4 h-4" />
        <span className="text-sm">Report pack builder</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Pack builder with document cards will be rendered here</p>
      </div>
    </div>
  )
}
