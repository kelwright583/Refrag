'use client'

import { useState } from 'react'
import { StickyNote, AlertCircle, RefreshCw, Plus, X, Check } from 'lucide-react'
import { useCommsLog, useCreateCommsLogEntry } from '@/hooks/use-comms'
import type { CommsLogEntryWithUser } from '@/lib/types/comms'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

const MAX_NOTE_LENGTH = 2000
const COUNTER_THRESHOLD = 200

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  if (diffDay === 1) {
    const time = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    return `Yesterday at ${time}`
  }
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function authorInitial(email: string | undefined): string {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

function authorDisplay(entry: CommsLogEntryWithUser): string {
  if (entry.sent_by_user?.email) return entry.sent_by_user.email
  return 'Team member'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D4CFC7] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 bg-[#D4CFC7] rounded" />
            <div className="h-3 w-full bg-[#D4CFC7] rounded" />
            <div className="h-3 w-3/4 bg-[#D4CFC7] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CaseNotesSection({ caseId }: SectionProps) {
  const { data: commsLog, isLoading, isError, refetch } = useCommsLog(caseId)
  const createEntry = useCreateCommsLogEntry()

  const [adding, setAdding] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Filter to only notes (not emails)
  const notes = commsLog?.filter((entry) => entry.channel === 'note') ?? []
  const charsLeft = MAX_NOTE_LENGTH - noteText.length
  const showCounter = charsLeft <= COUNTER_THRESHOLD

  async function handleSave() {
    if (!noteText.trim()) return
    await createEntry.mutateAsync({
      caseId,
      input: {
        case_id: caseId,
        channel: 'note',
        body_md: noteText.trim(),
      },
    })
    setNoteText('')
    setAdding(false)
  }

  function handleCancel() {
    setAdding(false)
    setNoteText('')
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <StickyNote className="w-4 h-4" />
          <span className="text-sm">Case notes</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <StickyNote className="w-4 h-4" />
          <span className="text-sm">Case notes</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load notes.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate">
          <StickyNote className="w-4 h-4" />
          <span className="text-sm">Case notes</span>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
          >
            <Plus className="w-3 h-3" /> Add Note
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-copper/30 bg-[#FAFAF8] p-3 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            rows={4}
            placeholder="Write a case note…"
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors resize-none bg-white"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={createEntry.isPending || !noteText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Check className="w-3.5 h-3.5" />
                {createEntry.isPending ? 'Saving…' : 'Save Note'}
              </button>
              <button
                onClick={handleCancel}
                disabled={createEntry.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              {createEntry.isError && <span className="text-xs text-red-600">Failed to save. Try again.</span>}
            </div>
            {showCounter && (
              <span className={`text-xs ${charsLeft < 50 ? 'text-red-500' : 'text-muted'}`}>
                {charsLeft} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {notes.length === 0 && !adding ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-2">
          <StickyNote className="w-7 h-7 text-[#D4CFC7] mx-auto" />
          <p className="text-sm text-slate">No notes yet. Add a note to capture observations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full bg-copper flex items-center justify-center text-white text-xs font-bold shrink-0"
                title={authorDisplay(note)}
              >
                {authorInitial(note.sent_by_user?.email)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-charcoal">{authorDisplay(note)}</span>
                  <span className="text-xs text-muted">{timeAgo(note.created_at)}</span>
                </div>
                <p className="text-sm text-charcoal mt-1 whitespace-pre-wrap break-words">{note.body_md}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
