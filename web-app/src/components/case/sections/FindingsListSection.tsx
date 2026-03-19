'use client'

import { Search } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function FindingsListSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Search className="w-4 h-4" />
        <span className="text-sm">Investigation findings</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Findings list will be rendered here</p>
      </div>
    </div>
  )
}
