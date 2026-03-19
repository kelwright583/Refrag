'use client'

import type { SectionState } from './SectionEditor'

interface OrgBranding {
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
}

interface CaseDetails {
  caseNumber?: string
  claimReference?: string
  clientName?: string
  lossDate?: string
}

interface ReportPreviewProps {
  sections: SectionState[]
  orgBranding: OrgBranding
  caseDetails: CaseDetails
  reportTitle: string
}

export default function ReportPreview({
  sections,
  orgBranding,
  caseDetails,
  reportTitle,
}: ReportPreviewProps) {
  const accentColor = orgBranding.primaryColor || '#B87333'
  const completedSections = sections.filter((s) => s.isComplete && s.bodyMd.trim())

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 style="font-size:10px;font-weight:600;margin:8px 0 3px;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:11px;font-weight:700;margin:10px 0 4px;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:12px;font-weight:700;margin:12px 0 4px;">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li style="margin-left:12px;list-style:disc;font-size:8px;">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:12px;list-style:decimal;font-size:8px;">$2</li>')
      .replace(/\n\n/g, '<br/>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="sticky top-6">
      <h3 className="text-sm font-semibold text-charcoal mb-3">Live Preview</h3>

      {/* A4 container — 210:297 aspect ratio */}
      <div
        className="bg-white border border-[#D4CFC7] rounded-lg shadow-sm overflow-hidden"
        style={{ aspectRatio: '210 / 297' }}
      >
        <div className="h-full flex flex-col overflow-y-auto" style={{ fontSize: '8px' }}>
          {/* Header with org branding */}
          <div
            className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
            style={{ borderColor: accentColor + '40' }}
          >
            <div className="flex items-center gap-2">
              {orgBranding.logoUrl ? (
                <img
                  src={orgBranding.logoUrl}
                  alt={orgBranding.name}
                  className="h-5 w-auto object-contain"
                />
              ) : (
                <div
                  className="h-5 w-5 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: accentColor, fontSize: '7px' }}
                >
                  {orgBranding.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-charcoal" style={{ fontSize: '9px' }}>
                {orgBranding.name}
              </span>
            </div>
            <div className="text-right text-slate/60" style={{ fontSize: '6px' }}>
              {caseDetails.claimReference && <div>Ref: {caseDetails.claimReference}</div>}
              {caseDetails.caseNumber && <div>Case: {caseDetails.caseNumber}</div>}
            </div>
          </div>

          {/* Title block */}
          <div className="px-4 pt-3 pb-2">
            <h1
              className="font-bold text-charcoal"
              style={{ fontSize: '12px', color: accentColor }}
            >
              {reportTitle}
            </h1>
            <div className="flex gap-3 mt-1 text-slate/60" style={{ fontSize: '6px' }}>
              {caseDetails.clientName && <span>Client: {caseDetails.clientName}</span>}
              {caseDetails.lossDate && <span>Loss Date: {caseDetails.lossDate}</span>}
            </div>
          </div>

          {/* Sections */}
          <div className="flex-1 px-4 pb-3 space-y-2">
            {completedSections.length === 0 && (
              <div className="flex items-center justify-center h-24 text-slate/40 italic" style={{ fontSize: '8px' }}>
                Complete sections to see them here
              </div>
            )}
            {completedSections.map((section, idx) => (
              <div key={section.key}>
                <h2
                  className="font-bold border-b pb-0.5 mb-1"
                  style={{
                    fontSize: '9px',
                    color: accentColor,
                    borderColor: accentColor + '30',
                  }}
                >
                  {idx + 1}. {section.heading}
                </h2>
                <div
                  className="text-charcoal/80 leading-tight"
                  style={{ fontSize: '7px' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(section.bodyMd) }}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="mt-auto px-4 py-2 border-t flex items-center justify-between"
            style={{ borderColor: '#D4CFC7' }}
          >
            <span className="text-slate/40" style={{ fontSize: '6px' }}>
              Powered by Refrag &middot; refrag.app
            </span>
            <span className="text-slate/40" style={{ fontSize: '6px' }}>
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
