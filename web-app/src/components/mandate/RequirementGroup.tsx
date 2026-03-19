'use client'

import { useState } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import {
  Contact2,
  Camera,
  FileText,
  ClipboardCheck,
  Shield,
  Settings,
} from 'lucide-react'
import { MandateRequirement, RequirementCategory } from '@/lib/types/mandate'
import { RequirementCard } from './RequirementCard'

const CATEGORY_ICONS: Record<RequirementCategory, typeof Contact2> = {
  identity_documents: Contact2,
  scene_damage_photos: Camera,
  third_party_documents: FileText,
  internal_checks: ClipboardCheck,
  specialist_requirements: Shield,
  custom: Settings,
}

const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  identity_documents: 'Identity Documents',
  scene_damage_photos: 'Scene / Damage Photos',
  third_party_documents: 'Third-Party Documents',
  internal_checks: 'Internal Checks',
  specialist_requirements: 'Specialist Requirements',
  custom: 'Custom',
}

interface RequirementGroupProps {
  category: RequirementCategory
  requirements: MandateRequirement[]
  onAddRequirement: (category: RequirementCategory) => void
  onUpdateRequirement: (requirementId: string, data: Partial<MandateRequirement>) => void
  onDeleteRequirement: (requirementId: string) => void
}

export function RequirementGroup({
  category,
  requirements,
  onAddRequirement,
  onUpdateRequirement,
  onDeleteRequirement,
}: RequirementGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const Icon = CATEGORY_ICONS[category] || Settings

  const { setNodeRef } = useDroppable({ id: `group-${category}` })

  return (
    <div className="bg-white border border-[#D4CFC7] rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate" />
        )}
        <Icon className="w-5 h-5 text-copper" />
        <span className="flex-1 text-sm font-semibold text-charcoal">
          {CATEGORY_LABELS[category] || category}
        </span>
        <span className="text-xs text-slate bg-white px-2 py-0.5 rounded-full border border-[#D4CFC7]">
          {requirements.length}
        </span>
      </button>

      {!collapsed && (
        <div ref={setNodeRef} className="p-3 space-y-2 min-h-[48px]">
          {requirements.length === 0 ? (
            <div className="text-center py-4 text-sm text-slate">
              No requirements in this group yet
            </div>
          ) : (
            <SortableContext
              items={requirements.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {requirements.map((req) => (
                <RequirementCard
                  key={req.id}
                  requirement={req}
                  onUpdate={(data) => onUpdateRequirement(req.id, data)}
                  onDelete={() => onDeleteRequirement(req.id)}
                />
              ))}
            </SortableContext>
          )}

          <button
            onClick={() => onAddRequirement(category)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate hover:text-copper border border-dashed border-[#D4CFC7] rounded-lg hover:border-copper transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add requirement
          </button>
        </div>
      )}
    </div>
  )
}
