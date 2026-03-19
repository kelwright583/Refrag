'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { MandateRequirement, EVIDENCE_TYPES, EvidenceType } from '@/lib/types/mandate'

interface RequirementCardProps {
  requirement: MandateRequirement
  onUpdate: (data: Partial<MandateRequirement>) => void
  onDelete: () => void
}

const EVIDENCE_BADGE_COLORS: Record<EvidenceType, string> = {
  photo: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  document: 'bg-amber-100 text-amber-700',
  text_note: 'bg-green-100 text-green-700',
  none: 'bg-gray-100 text-gray-500',
}

export function RequirementCard({ requirement, onUpdate, onDelete }: RequirementCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue, setLabelValue] = useState(requirement.label)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: requirement.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleLabelBlur = () => {
    setEditingLabel(false)
    if (labelValue.trim() && labelValue !== requirement.label) {
      onUpdate({ label: labelValue.trim() } as any)
    } else {
      setLabelValue(requirement.label)
    }
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      setLabelValue(requirement.label)
      setEditingLabel(false)
    }
  }

  const isRequired = requirement.is_required ?? requirement.required

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-[#D4CFC7] rounded-lg p-3 group ${
        isDragging ? 'shadow-lg ring-2 ring-copper/30' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate hover:text-charcoal touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              autoFocus
              className="w-full text-sm font-medium text-charcoal px-2 py-1 border border-copper rounded focus:outline-none focus:ring-2 focus:ring-copper/30"
            />
          ) : (
            <button
              onClick={() => setEditingLabel(true)}
              className="text-sm font-medium text-charcoal text-left truncate block w-full hover:text-copper transition-colors"
            >
              {requirement.label}
            </button>
          )}
        </div>

        <button
          onClick={() =>
            onUpdate({ is_required: !isRequired } as any)
          }
          className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
            isRequired
              ? 'bg-copper/10 text-copper'
              : 'bg-gray-100 text-slate'
          }`}
        >
          {isRequired ? 'Required' : 'Optional'}
        </button>

        <span
          className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${
            EVIDENCE_BADGE_COLORS[requirement.evidence_type] || EVIDENCE_BADGE_COLORS.none
          }`}
        >
          {EVIDENCE_TYPES.find((t) => t.value === requirement.evidence_type)?.label || 'None'}
        </span>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate hover:text-charcoal flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onDelete}
              className="text-xs text-red-600 font-medium hover:underline"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-slate hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pl-7 space-y-3 border-t border-[#D4CFC7] pt-3">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Evidence Type</label>
            <select
              value={requirement.evidence_type}
              onChange={(e) =>
                onUpdate({ evidence_type: e.target.value as EvidenceType } as any)
              }
              className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Guidance Note</label>
            <textarea
              value={requirement.guidance_note || ''}
              onChange={(e) =>
                onUpdate({ guidance_note: e.target.value || null } as any)
              }
              placeholder="Optional instructions for the assessor..."
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
