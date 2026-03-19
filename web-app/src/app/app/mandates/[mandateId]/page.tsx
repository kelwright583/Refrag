'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Save,
  Copy,
  Loader2,
} from 'lucide-react'
import {
  useMandate,
  useUpdateMandate,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useBulkUpdateRequirements,
} from '@/hooks/use-mandates'
import { useClients } from '@/hooks/use-clients'
import {
  MandateRequirement,
  RequirementCategory,
  REQUIREMENT_CATEGORIES,
  VERTICAL_OPTIONS,
} from '@/lib/types/mandate'
import { RequirementGroup } from '@/components/mandate/RequirementGroup'
import { RequirementCard } from '@/components/mandate/RequirementCard'
import { MandateImportModal } from '@/components/mandate/MandateImportModal'

function getCategoryFromDescription(description: string | null): RequirementCategory {
  if (!description) return 'custom'
  const d = description.toLowerCase()
  if (REQUIREMENT_CATEGORIES.some((c) => c.value === d)) return d as RequirementCategory
  if (d.includes('identity') || d.includes('id ') || d.includes('vin') || d.includes('registration')) return 'identity_documents'
  if (d.includes('photo') || d.includes('scene') || d.includes('damage') || d.includes('camera')) return 'scene_damage_photos'
  if (d.includes('third') || d.includes('quote') || d.includes('invoice') || d.includes('statement')) return 'third_party_documents'
  if (d.includes('check') || d.includes('policy') || d.includes('verify') || d.includes('internal')) return 'internal_checks'
  if (d.includes('specialist') || d.includes('structural') || d.includes('fica')) return 'specialist_requirements'
  return 'custom'
}

export default function MandateBuilderPage() {
  const params = useParams<{ mandateId: string }>()
  const mandateId = params.mandateId
  const router = useRouter()

  const { data: mandate, isLoading } = useMandate(mandateId)
  const { data: clients } = useClients()
  const updateMandate = useUpdateMandate(mandateId)
  const createRequirement = useCreateRequirement(mandateId)
  const updateRequirementMutation = useUpdateRequirement(mandateId)
  const deleteRequirement = useDeleteRequirement(mandateId)
  const bulkUpdate = useBulkUpdateRequirements(mandateId)

  const [editName, setEditName] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localRequirements, setLocalRequirements] = useState<MandateRequirement[]>([])
  const [hasLocalChanges, setHasLocalChanges] = useState(false)

  useEffect(() => {
    if (mandate) {
      setEditName(mandate.name)
      setLocalRequirements(mandate.requirements || [])
      setHasLocalChanges(false)
    }
  }, [mandate])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const groupedRequirements = useMemo(() => {
    const groups: Record<RequirementCategory, MandateRequirement[]> = {
      identity_documents: [],
      scene_damage_photos: [],
      third_party_documents: [],
      internal_checks: [],
      specialist_requirements: [],
      custom: [],
    }

    for (const req of localRequirements) {
      const cat = getCategoryFromDescription(req.description)
      if (groups[cat]) {
        groups[cat].push(req)
      } else {
        groups.custom.push(req)
      }
    }

    for (const key of Object.keys(groups) as RequirementCategory[]) {
      groups[key].sort((a, b) => a.order_index - b.order_index)
    }

    return groups
  }, [localRequirements])

  const activeRequirement = activeId
    ? localRequirements.find((r) => r.id === activeId) || null
    : null

  const findCategoryForRequirement = useCallback(
    (reqId: string): RequirementCategory | null => {
      for (const [cat, reqs] of Object.entries(groupedRequirements)) {
        if (reqs.some((r) => r.id === reqId)) return cat as RequirementCategory
      }
      return null
    },
    [groupedRequirements]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeReqId = active.id as string
    const overId = over.id as string

    const overCategory = overId.startsWith('group-')
      ? (overId.replace('group-', '') as RequirementCategory)
      : findCategoryForRequirement(overId)

    if (!overCategory) return

    const activeCategory = findCategoryForRequirement(activeReqId)
    if (!activeCategory || activeCategory === overCategory) return

    setLocalRequirements((prev) => {
      const updated = prev.map((r) => {
        if (r.id === activeReqId) {
          return { ...r, description: overCategory }
        }
        return r
      })
      return updated
    })
    setHasLocalChanges(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeReqId = active.id as string
    const overId = over.id as string

    const targetCategory = overId.startsWith('group-')
      ? (overId.replace('group-', '') as RequirementCategory)
      : findCategoryForRequirement(overId)

    if (!targetCategory) return

    setLocalRequirements((prev) => {
      const updated = [...prev]
      const activeIdx = updated.findIndex((r) => r.id === activeReqId)
      if (activeIdx === -1) return prev

      updated[activeIdx] = { ...updated[activeIdx], description: targetCategory }

      const categoryItems = updated
        .filter((r) => getCategoryFromDescription(r.description) === targetCategory)
        .sort((a, b) => a.order_index - b.order_index)

      if (!overId.startsWith('group-')) {
        const overIdx = categoryItems.findIndex((r) => r.id === overId)
        const fromIdx = categoryItems.findIndex((r) => r.id === activeReqId)
        if (fromIdx !== -1 && overIdx !== -1) {
          const [moved] = categoryItems.splice(fromIdx, 1)
          categoryItems.splice(overIdx, 0, moved)
        }
      }

      categoryItems.forEach((item, i) => {
        const globalIdx = updated.findIndex((r) => r.id === item.id)
        if (globalIdx !== -1) {
          updated[globalIdx] = { ...updated[globalIdx], order_index: i }
        }
      })

      return updated
    })
    setHasLocalChanges(true)
  }

  const handleSaveOrder = async () => {
    const updates = localRequirements.map((r) => ({
      id: r.id,
      order_index: r.order_index,
      category: getCategoryFromDescription(r.description),
    }))
    try {
      await bulkUpdate.mutateAsync(updates)
      setHasLocalChanges(false)
    } catch {
      // handled by mutation state
    }
  }

  const handleAddRequirement = async (category: RequirementCategory) => {
    const categoryReqs = groupedRequirements[category] || []
    const maxOrder = categoryReqs.length > 0
      ? Math.max(...categoryReqs.map((r) => r.order_index))
      : -1

    try {
      await createRequirement.mutateAsync({
        label: 'New requirement',
        category,
        is_required: true,
        evidence_type: 'none',
        order_index: maxOrder + 1,
      })
    } catch {
      // handled by mutation state
    }
  }

  const handleUpdateRequirement = async (
    requirementId: string,
    data: Partial<MandateRequirement>
  ) => {
    try {
      await updateRequirementMutation.mutateAsync({ requirementId, data: data as any })
    } catch {
      // handled by mutation state
    }
  }

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      await deleteRequirement.mutateAsync(requirementId)
    } catch {
      // handled by mutation state
    }
  }

  const handleNameBlur = async () => {
    if (editName.trim() && editName !== mandate?.name) {
      await updateMandate.mutateAsync({ name: editName.trim() })
    }
  }

  const handleFieldUpdate = async (field: string, value: any) => {
    await updateMandate.mutateAsync({ [field]: value })
  }

  if (isLoading) {
    return (
      <div className="text-center py-24">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-copper" />
        <p className="text-slate mt-4">Loading mandate...</p>
      </div>
    )
  }

  if (!mandate) {
    return (
      <div className="text-center py-24">
        <p className="text-charcoal font-medium">Mandate not found</p>
        <button
          onClick={() => router.push('/app/mandates')}
          className="text-copper hover:underline mt-2 text-sm"
        >
          Back to mandates
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/app/mandates')}
        className="flex items-center gap-2 text-sm text-slate hover:text-charcoal mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Mandates
      </button>

      {/* Header */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameBlur}
              className="text-2xl font-heading font-bold text-charcoal bg-transparent border-none focus:outline-none focus:ring-0 w-full hover:bg-gray-50 rounded px-1 -ml-1"
            />
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate hover:text-copper border border-[#D4CFC7] rounded-lg hover:border-copper transition-colors"
          >
            <Copy className="w-4 h-4" />
            Import
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Client</label>
            <select
              value={mandate.client_id || ''}
              onChange={(e) => handleFieldUpdate('client_id', e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
            >
              <option value="">Org-wide</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Vertical</label>
            <select
              value={mandate.vertical || 'all'}
              onChange={(e) => handleFieldUpdate('vertical', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
            >
              {VERTICAL_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Default</label>
            <button
              onClick={() => handleFieldUpdate('is_default', !mandate.is_default)}
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                mandate.is_default
                  ? 'bg-copper/10 border-copper text-copper font-medium'
                  : 'border-[#D4CFC7] text-slate hover:border-copper/50'
              }`}
            >
              {mandate.is_default ? 'Default mandate' : 'Not default'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">Status</label>
            <button
              onClick={() => handleFieldUpdate('is_active', !mandate.is_active)}
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                mandate.is_active
                  ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                  : 'bg-gray-50 border-[#D4CFC7] text-slate'
              }`}
            >
              {mandate.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>

      {/* Save order bar */}
      {hasLocalChanges && (
        <div className="sticky top-0 z-10 bg-copper/10 border border-copper/30 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-copper">
            You have unsaved ordering changes
          </span>
          <button
            onClick={handleSaveOrder}
            disabled={bulkUpdate.isPending}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {bulkUpdate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Order
          </button>
        </div>
      )}

      {/* Requirement Groups */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {REQUIREMENT_CATEGORIES.map((cat) => (
            <RequirementGroup
              key={cat.value}
              category={cat.value}
              requirements={groupedRequirements[cat.value] || []}
              onAddRequirement={handleAddRequirement}
              onUpdateRequirement={handleUpdateRequirement}
              onDeleteRequirement={handleDeleteRequirement}
            />
          ))}
        </div>

        <DragOverlay>
          {activeRequirement ? (
            <div className="opacity-80">
              <RequirementCard
                requirement={activeRequirement}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <MandateImportModal
        visible={showImportModal}
        currentMandateId={mandateId}
        onClose={() => setShowImportModal(false)}
        onImported={(newId) => {
          setShowImportModal(false)
          router.push(`/app/mandates/${newId}`)
        }}
      />
    </div>
  )
}
