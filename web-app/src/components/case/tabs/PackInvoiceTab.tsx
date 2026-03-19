'use client'

import { type SectionKey } from '@/lib/verticals/config'
import { SECTION_COMPONENTS, getSectionLabel, type SectionProps } from '../sections'
import { AccordionSection } from '../AccordionSection'

interface TabProps {
  sections: SectionKey[]
  caseId: string
  orgSettings: any
}

export function PackInvoiceTab({ sections, caseId, orgSettings }: TabProps) {
  return (
    <div className="space-y-3">
      {sections.map((key, idx) => {
        const Component = SECTION_COMPONENTS[key]
        if (!Component) return null
        return (
          <AccordionSection
            key={key}
            title={getSectionLabel(key)}
            defaultOpen={idx === 0}
          >
            <Component caseId={caseId} orgSettings={orgSettings} />
          </AccordionSection>
        )
      })}
    </div>
  )
}
