'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  Check,
  X,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react'
import type { ReportSectionTemplate } from '@/lib/verticals/config'

export interface SectionState {
  key: string
  heading: string
  bodyMd: string
  isComplete: boolean
  aiDraft: string | null
  aiDraftPending: boolean
}

interface SectionEditorProps {
  template: ReportSectionTemplate
  state: SectionState
  index: number
  caseId: string
  vertical: string
  contextData: Record<string, unknown>
  onUpdate: (key: string, updates: Partial<SectionState>) => void
}

export default function SectionEditor({
  template,
  state,
  index,
  caseId,
  vertical,
  contextData,
  onUpdate,
}: SectionEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [collapsed, setCollapsed] = useState(state.isComplete)
  const [drafting, setDrafting] = useState(false)
  const [editingHeading, setEditingHeading] = useState(false)
  const [headingValue, setHeadingValue] = useState(state.heading)

  const handleAIDraft = useCallback(async () => {
    setDrafting(true)
    onUpdate(state.key, { aiDraftPending: true })

    try {
      const response = await fetch('/api/ai/draft-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          section_key: state.key,
          vertical,
          context_data: contextData,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Draft failed' }))
        throw new Error(err.error || 'AI draft generation failed')
      }

      const data = await response.json()
      onUpdate(state.key, { aiDraft: data.content, aiDraftPending: false })
    } catch {
      onUpdate(state.key, { aiDraft: null, aiDraftPending: false })
    } finally {
      setDrafting(false)
    }
  }, [caseId, vertical, contextData, state.key, onUpdate])

  const handleAcceptDraft = useCallback(() => {
    if (state.aiDraft) {
      onUpdate(state.key, { bodyMd: state.aiDraft, aiDraft: null })
    }
  }, [state.key, state.aiDraft, onUpdate])

  const handleRejectDraft = useCallback(() => {
    onUpdate(state.key, { aiDraft: null })
  }, [state.key, onUpdate])

  const handleEditDraft = useCallback(() => {
    if (state.aiDraft) {
      onUpdate(state.key, { bodyMd: state.aiDraft, aiDraft: null })
    }
  }, [state.key, state.aiDraft, onUpdate])

  const handleToggleComplete = useCallback(() => {
    const next = !state.isComplete
    onUpdate(state.key, { isComplete: next })
    if (next) setCollapsed(true)
  }, [state.key, state.isComplete, onUpdate])

  const handleHeadingSave = useCallback(() => {
    onUpdate(state.key, { heading: headingValue })
    setEditingHeading(false)
  }, [state.key, headingValue, onUpdate])

  const handleBodyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(state.key, { bodyMd: e.target.value })
    },
    [state.key, onUpdate],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const target = e.currentTarget
        const start = target.selectionStart
        const end = target.selectionEnd
        const value = target.value
        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        onUpdate(state.key, { bodyMd: newValue })
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2
        })
      }
    },
    [state.key, onUpdate],
  )

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-charcoal mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-charcoal mt-4 mb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-charcoal mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div
      className={`border rounded-xl transition-all ${
        state.isComplete
          ? 'border-green-200 bg-green-50/30'
          : template.isRequired
            ? 'border-amber-200 bg-white'
            : 'border-[#D4CFC7] bg-white'
      }`}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate flex-shrink-0" />
        )}

        <span className="text-sm font-medium text-slate/60 w-6">{index + 1}.</span>

        {state.isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : template.isRequired ? (
          <Circle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-slate/30 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {editingHeading ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={headingValue}
                onChange={(e) => setHeadingValue(e.target.value)}
                onBlur={handleHeadingSave}
                onKeyDown={(e) => e.key === 'Enter' && handleHeadingSave()}
                className="flex-1 px-2 py-1 text-sm font-semibold text-charcoal border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-copper"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-charcoal truncate">{state.heading}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingHeading(true)
                }}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate hover:text-copper transition-opacity"
                title="Edit heading"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-slate/60 truncate">{template.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {template.isRequired && !state.isComplete && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              Required
            </span>
          )}
          <button
            onClick={handleToggleComplete}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              state.isComplete
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-slate hover:bg-gray-200'
            }`}
          >
            {state.isComplete ? 'Completed' : 'Mark complete'}
          </button>
        </div>
      </div>

      {/* Collapsed state — nothing else to show */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3 border-t border-[#D4CFC7]/50">
          {/* AI Draft pending overlay */}
          {state.aiDraft && (
            <div className="mt-3 border border-blue-200 rounded-lg bg-blue-50/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">AI Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleAcceptDraft}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={handleEditDraft}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleRejectDraft}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-200 text-charcoal rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Discard
                  </button>
                </div>
              </div>
              <div
                className="prose prose-sm max-w-none text-charcoal/80"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(state.aiDraft) }}
              />
            </div>
          )}

          {/* Auto-populated notice */}
          {template.autoPopulatedFrom && (
            <div className="mt-3 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                This section is auto-generated from{' '}
                <span className="font-semibold">{template.autoPopulatedFrom}</span>.
                {' '}You can also add supplementary notes below if needed.
              </p>
            </div>
          )}

          {/* Content area */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-slate hover:text-charcoal transition-colors"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>

              {template.aiDraftAvailable && (
                <button
                  onClick={handleAIDraft}
                  disabled={drafting}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-copper/10 text-copper rounded-lg hover:bg-copper/20 transition-colors disabled:opacity-50 font-medium"
                >
                  {drafting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {drafting ? 'Drafting...' : 'Draft with AI'}
                </button>
              )}
            </div>

            {showPreview ? (
              <div
                className="min-h-[120px] p-4 border border-[#D4CFC7] rounded-lg bg-[#FAFAF8] prose prose-sm max-w-none text-charcoal"
                dangerouslySetInnerHTML={{
                  __html: state.bodyMd
                    ? renderMarkdown(state.bodyMd)
                    : '<p class="text-slate/40 italic">No content yet</p>',
                }}
              />
            ) : (
              <textarea
                value={state.bodyMd}
                onChange={handleBodyChange}
                onKeyDown={handleKeyDown}
                rows={6}
                placeholder={`Write ${template.heading.toLowerCase()} content here... (Markdown supported)`}
                className="w-full px-4 py-3 border border-[#D4CFC7] rounded-lg bg-white text-charcoal text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
