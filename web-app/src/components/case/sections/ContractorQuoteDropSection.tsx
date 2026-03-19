'use client'

import { FileDown } from 'lucide-react'

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function ContractorQuoteDropSection({ caseId }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <FileDown className="w-4 h-4" />
        <span className="text-sm">Contractor quote drop zone</span>
      </div>
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
        <p className="text-sm text-slate">Drag &amp; drop contractor quote here</p>
      </div>
    </div>
  )
}
