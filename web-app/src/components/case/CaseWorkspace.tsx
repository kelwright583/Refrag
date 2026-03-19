'use client'

import { useState } from 'react'
import { getVerticalConfig, type VerticalConfig } from '@/lib/verticals'
import { OverviewTab } from './tabs/OverviewTab'
import { CaptureTab } from './tabs/CaptureTab'
import { AssessmentTab } from './tabs/AssessmentTab'
import { ReportTab } from './tabs/ReportTab'
import { PackInvoiceTab } from './tabs/PackInvoiceTab'

const TAB_KEYS = ['overview', 'capture', 'assessment', 'report', 'pack'] as const
type TabKey = (typeof TAB_KEYS)[number]

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  capture: 'Capture',
  assessment: 'Assessment',
  report: 'Report',
  pack: 'Pack & Invoice',
}

interface CaseWorkspaceProps {
  caseData: any
  orgSettings: any
}

export function CaseWorkspace({ caseData, orgSettings }: CaseWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const verticalConfig = getVerticalConfig(caseData.vertical ?? 'general')

  const tabComponents: Record<TabKey, React.ReactNode> = {
    overview: (
      <OverviewTab
        sections={verticalConfig.sections.overview}
        caseId={caseData.id}
        orgSettings={orgSettings}
      />
    ),
    capture: (
      <CaptureTab
        sections={verticalConfig.sections.capture}
        caseId={caseData.id}
        orgSettings={orgSettings}
      />
    ),
    assessment: (
      <AssessmentTab
        sections={verticalConfig.sections.assessment}
        caseId={caseData.id}
        orgSettings={orgSettings}
      />
    ),
    report: (
      <ReportTab
        sections={verticalConfig.sections.report}
        caseId={caseData.id}
        orgSettings={orgSettings}
      />
    ),
    pack: (
      <PackInvoiceTab
        sections={verticalConfig.sections.pack}
        caseId={caseData.id}
        orgSettings={orgSettings}
      />
    ),
  }

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b border-[#D4CFC7] mb-6">
        <nav className="flex gap-0 -mb-px" aria-label="Case workspace tabs">
          {TAB_KEYS.map((key) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`
                  px-5 py-3 text-sm font-medium transition-colors relative
                  ${
                    isActive
                      ? 'text-copper border-b-2 border-copper'
                      : 'text-slate hover:text-charcoal hover:bg-[#FAFAF8]'
                  }
                `}
              >
                {TAB_LABELS[key]}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Active Tab Content */}
      <div>{tabComponents[activeTab]}</div>
    </div>
  )
}
