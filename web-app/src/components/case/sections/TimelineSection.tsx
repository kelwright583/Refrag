'use client'

import { Clock, FolderOpen, Camera, ArrowRight, StickyNote, ClipboardList, FileText } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'
import { useCommsLog } from '@/hooks/use-comms'
import { useRiskItems } from '@/hooks/use-risk-items'
import { useCaseMandates } from '@/hooks/use-mandates'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

interface TimelineEvent {
  id: string
  type: 'case_created' | 'note_added' | 'mandate' | 'report' | 'evidence' | 'status_changed' | 'risk_item'
  description: string
  created_at: string
  actor?: string
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffHour < 24) {
    if (diffHour < 1) return 'Less than an hour ago'
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  }
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EventIcon({ type }: { type: TimelineEvent['type'] }) {
  const cls = 'w-3 h-3'
  switch (type) {
    case 'case_created': return <FolderOpen className={cls} />
    case 'evidence': return <Camera className={cls} />
    case 'status_changed': return <ArrowRight className={cls} />
    case 'note_added': return <StickyNote className={cls} />
    case 'mandate': return <ClipboardList className={cls} />
    case 'report': return <FileText className={cls} />
    case 'risk_item': return <FileText className={cls} />
    default: return <Clock className={cls} />
  }
}

function LoadingSkeleton() {
  return (
    <div className="relative animate-pulse">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[#D4CFC7]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="relative pl-10 pb-5">
          <div className="absolute left-2 w-4 h-4 rounded-full bg-[#D4CFC7] border-2 border-white" />
          <div className="h-3 w-48 bg-[#D4CFC7] rounded mb-1.5" />
          <div className="h-2.5 w-24 bg-[#D4CFC7] rounded" />
        </div>
      ))}
    </div>
  )
}

export function TimelineSection({ caseId }: SectionProps) {
  const { data: caseData, isLoading: loadingCase } = useCase(caseId)
  const { data: commsLog, isLoading: loadingComms } = useCommsLog(caseId)
  const { data: riskItems, isLoading: loadingRisk } = useRiskItems(caseId)
  const { data: mandatesData, isLoading: loadingMandates } = useCaseMandates(caseId)

  const isLoading = loadingCase || loadingComms || loadingRisk || loadingMandates

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Activity timeline</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  // Build events from all available data
  const events: TimelineEvent[] = []

  if (caseData) {
    events.push({
      id: `case-created-${caseData.id}`,
      type: 'case_created',
      description: `Case ${caseData.case_number} created`,
      created_at: caseData.created_at,
    })
  }

  if (Array.isArray(riskItems)) {
    for (const item of riskItems) {
      const label = item.risk_type === 'motor_vehicle'
        ? 'Vehicle risk item added'
        : `${item.risk_type.replace(/_/g, ' ')} risk item added`
      events.push({
        id: `risk-${item.id}`,
        type: 'risk_item',
        description: label,
        created_at: item.created_at,
      })
    }
  }

  if (Array.isArray(commsLog)) {
    for (const entry of commsLog) {
      if (entry.channel === 'note') {
        events.push({
          id: `note-${entry.id}`,
          type: 'note_added',
          description: 'Note added',
          created_at: entry.created_at,
          actor: entry.sent_by_user?.email,
        })
      } else if (entry.channel === 'email') {
        events.push({
          id: `email-${entry.id}`,
          type: 'report',
          description: entry.subject ? `Email sent: ${entry.subject}` : 'Email sent',
          created_at: entry.created_at,
          actor: entry.sent_by_user?.email,
        })
      }
    }
  }

  const mandateList = Array.isArray(mandatesData)
    ? mandatesData
    : mandatesData
    ? [mandatesData]
    : []

  for (const m of mandateList as Array<{ id: string; name: string; created_at: string }>) {
    if (m?.created_at) {
      events.push({
        id: `mandate-${m.id}`,
        type: 'mandate',
        description: `Mandate assigned: ${m.name}`,
        created_at: m.created_at,
      })
    }
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Clock className="w-4 h-4" />
        <span className="text-sm">Activity timeline</span>
      </div>

      {events.length === 0 ? (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#D4CFC7]" />
          <div className="relative pl-10 pb-4">
            <div className="absolute left-2 w-4 h-4 rounded-full bg-white border-2 border-[#D4CFC7] flex items-center justify-center">
              <Clock className="w-2.5 h-2.5 text-muted" />
            </div>
            <p className="text-sm text-charcoal">Activity timeline will appear here as work progresses.</p>
            <p className="text-xs text-muted mt-0.5">No events recorded yet.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#D4CFC7]" />
          {events.map((event, idx) => (
            <div key={event.id} className={`relative pl-10 ${idx < events.length - 1 ? 'pb-4' : 'pb-1'}`}>
              <div className="absolute left-2 w-4 h-4 rounded-full bg-white border-2 border-[#D4CFC7] flex items-center justify-center text-muted">
                <EventIcon type={event.type} />
              </div>
              <p className="text-sm text-charcoal">{event.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted">{timeAgo(event.created_at)}</p>
                {event.actor && (
                  <span className="text-xs text-muted">· {event.actor}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
