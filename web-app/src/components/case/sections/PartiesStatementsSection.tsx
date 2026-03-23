'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronRight, Users, Upload, AlertCircle } from 'lucide-react'
import { useCaseContacts } from '@/hooks/use-contacts'
import { useUploadEvidence } from '@/hooks/use-evidence'
import type { CaseContact } from '@/lib/types/contact'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type InterviewStatus = 'Not Interviewed' | 'Interview Requested' | 'Interview Conducted' | 'Declined' | 'Not Available'
type StatementStatus = 'Not Obtained' | 'Statement Drafted' | 'Sworn Statement' | 'Refused'

interface PartyData {
  interviewStatus: InterviewStatus
  statementStatus: StatementStatus
  interviewDate: string
  interviewerName: string
  notes: string
}

const STORAGE_KEY_PREFIX = 'parties_statements_'

const interviewStatusColor: Record<InterviewStatus, string> = {
  'Not Interviewed': 'bg-slate-100 text-slate-600',
  'Interview Requested': 'bg-amber-100 text-amber-700',
  'Interview Conducted': 'bg-green-100 text-green-700',
  'Declined': 'bg-red-100 text-red-700',
  'Not Available': 'bg-gray-100 text-gray-600',
}

const statementStatusColor: Record<StatementStatus, string> = {
  'Not Obtained': 'bg-slate-100 text-slate-600',
  'Statement Drafted': 'bg-blue-100 text-blue-700',
  'Sworn Statement': 'bg-green-100 text-green-700',
  'Refused': 'bg-red-100 text-red-700',
}

const roleColorClass: Record<string, string> = {
  insured: 'bg-blue-100 text-blue-700',
  broker: 'bg-purple-100 text-purple-700',
  insurer: 'bg-indigo-100 text-indigo-700',
  panelbeater: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-600',
}

const defaultPartyData = (): PartyData => ({
  interviewStatus: 'Not Interviewed',
  statementStatus: 'Not Obtained',
  interviewDate: '',
  interviewerName: '',
  notes: '',
})

function PartyAccordion({
  contact,
  data,
  onChange,
  caseId,
}: {
  contact: CaseContact
  data: PartyData
  onChange: (d: PartyData) => void
  caseId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutate: uploadEvidence, isPending: uploading } = useUploadEvidence()

  const handleUpload = (file: File) => {
    uploadEvidence({
      caseId,
      file,
      mediaType: 'document',
      options: { tags: ['STATEMENT'], notes: `Statement for ${contact.name}` },
    })
  }

  return (
    <div className="border border-[#D4CFC7] rounded-xl bg-white overflow-hidden">
      {/* Collapsed header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate" /> : <ChevronRight className="w-4 h-4 text-slate" />}
          <div>
            <span className="text-sm font-semibold text-charcoal">{contact.name}</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${roleColorClass[contact.type] ?? 'bg-slate-100 text-slate-600'}`}>
              {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${interviewStatusColor[data.interviewStatus]}`}>
            {data.interviewStatus}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statementStatusColor[data.statementStatus]}`}>
            {data.statementStatus}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[#D4CFC7]/50 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Interview Status</label>
              <select
                value={data.interviewStatus}
                onChange={e => onChange({ ...data, interviewStatus: e.target.value as InterviewStatus })}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Not Interviewed', 'Interview Requested', 'Interview Conducted', 'Declined', 'Not Available'] as InterviewStatus[]).map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Statement Status</label>
              <select
                value={data.statementStatus}
                onChange={e => onChange({ ...data, statementStatus: e.target.value as StatementStatus })}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              >
                {(['Not Obtained', 'Statement Drafted', 'Sworn Statement', 'Refused'] as StatementStatus[]).map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Interview Date</label>
              <input
                type="date"
                value={data.interviewDate}
                onChange={e => onChange({ ...data, interviewDate: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Interviewer Name</label>
              <input
                type="text"
                value={data.interviewerName}
                onChange={e => onChange({ ...data, interviewerName: e.target.value })}
                placeholder="Name of interviewer..."
                className="w-full px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Interview Notes</label>
            <textarea
              value={data.notes}
              onChange={e => onChange({ ...data, notes: e.target.value })}
              rows={3}
              placeholder="Key points from interview, observations..."
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload Statement'}
            </button>
            <span className="text-xs text-slate/60">PDF, DOC, TXT — tagged as STATEMENT</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function PartiesStatementsSection({ caseId }: SectionProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${caseId}`
  const { data: contacts, isLoading, error } = useCaseContacts(caseId)
  const [partyData, setPartyData] = useState<Record<string, PartyData>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setPartyData(JSON.parse(raw))
    } catch {}
  }, [storageKey])

  const persist = useCallback((updated: Record<string, PartyData>) => {
    setPartyData(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
  }, [storageKey])

  const handleChange = useCallback((contactId: string, data: PartyData) => {
    persist({ ...partyData, [contactId]: data })
  }, [partyData, persist])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 border border-red-200 bg-red-50 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700">Failed to load contacts: {error.message}</p>
      </div>
    )
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
        <Users className="w-8 h-8 text-slate/30 mx-auto mb-2" />
        <p className="text-sm text-slate">No contacts on this case yet. Add contacts in the Contacts section first.</p>
      </div>
    )
  }

  const conducted = contacts.filter(c => (partyData[c.id]?.interviewStatus ?? 'Not Interviewed') === 'Interview Conducted').length
  const sworn = contacts.filter(c => (partyData[c.id]?.statementStatus ?? 'Not Obtained') === 'Sworn Statement').length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <Users className="w-4 h-4 text-slate" />
        <span className="text-sm text-charcoal">{contacts.length} parties</span>
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
          {conducted} interviewed
        </span>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
          {sworn} sworn statements
        </span>
      </div>

      <div className="space-y-2">
        {contacts.map((contact: CaseContact) => (
          <PartyAccordion
            key={contact.id}
            contact={contact}
            data={partyData[contact.id] ?? defaultPartyData()}
            onChange={(d) => handleChange(contact.id, d)}
            caseId={caseId}
          />
        ))}
      </div>
    </div>
  )
}
