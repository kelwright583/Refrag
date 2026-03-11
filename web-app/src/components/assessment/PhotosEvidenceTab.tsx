'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Upload, Image, X, Link2, Unlink } from 'lucide-react'
import { useEvidence, useUploadEvidence } from '@/hooks/use-evidence'
import { getEvidenceSignedUrl } from '@/lib/api/evidence'
import {
  useCreateReportEvidenceLink,
  useDeleteReportEvidenceLink,
} from '@/hooks/use-assessments'
import { Section } from './shared'
import type { FullMotorAssessment } from '@/lib/types/assessment'
import type { EvidenceWithTags } from '@/lib/types/evidence'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

const DAMAGE_SECTIONS = [
  { key: 'overview', label: 'Damage Overview' },
  { key: 'front', label: 'Front' },
  { key: 'rear', label: 'Rear' },
  { key: 'left', label: 'Left Side' },
  { key: 'right', label: 'Right Side' },
  { key: 'interior', label: 'Interior' },
  { key: 'undercarriage', label: 'Undercarriage' },
  { key: 'other', label: 'Other' },
]

export function PhotosEvidenceTab({ assessment, onNavigate }: Props) {
  const caseId = assessment.case_id
  const { data: evidence, isLoading } = useEvidence(caseId)
  const uploadEvidence = useUploadEvidence()
  const createLink = useCreateReportEvidenceLink(assessment.id)
  const deleteLink = useDeleteReportEvidenceLink(assessment.id)

  const [dragActive, setDragActive] = useState(false)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [linkingEvidence, setLinkingEvidence] = useState<EvidenceWithTags | null>(null)
  const [linkSection, setLinkSection] = useState('overview')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const linkedIds = new Set(assessment.report_evidence_links?.map((l) => l.evidence_id) ?? [])
  const photos = evidence?.filter((e) => e.media_type === 'photo') ?? []

  useEffect(() => {
    if (photos.length === 0) return
    const load = async () => {
      const urls: Record<string, string> = {}
      for (const p of photos) {
        try {
          urls[p.id] = await getEvidenceSignedUrl(caseId, p.id)
        } catch {
          // ignore
        }
      }
      setImageUrls(urls)
    }
    load()
  }, [photos, caseId])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      for (const file of files) {
        await uploadEvidence.mutateAsync({ caseId, file, mediaType: 'photo' })
      }
    },
    [caseId, uploadEvidence]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
      for (const file of files) {
        await uploadEvidence.mutateAsync({ caseId, file, mediaType: 'photo' })
      }
      e.target.value = ''
    },
    [caseId, uploadEvidence]
  )

  const handleLink = async () => {
    if (!linkingEvidence) return
    await createLink.mutateAsync({
      evidence_id: linkingEvidence.id,
      report_section: linkSection,
      display_order: 0,
    })
    setLinkingEvidence(null)
  }

  const getLinksForSection = (section: string) =>
    assessment.report_evidence_links?.filter((l) => l.report_section === section) ?? []

  return (
    <div className="space-y-5">
      <Section title="Photos & Evidence">
        <p className="text-sm text-slate mb-4">
          Photos from case evidence or drag-and-drop uploads. Link photos to damage areas for the Report Pack.
        </p>

        {/* Drag-drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
            dragActive ? 'border-copper bg-copper/5' : 'border-[#D4CFC7] hover:border-copper/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <Upload className={`w-7 h-7 ${dragActive ? 'text-copper' : 'text-slate/40'}`} />
          <p className="text-sm font-medium text-charcoal">Drop photos here or click to browse</p>
          <p className="text-xs text-slate">Images will be added to case evidence and can be linked below</p>
        </div>

        {/* Link modal */}
        {linkingEvidence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="font-semibold text-charcoal mb-3">Link to damage area</h3>
              <select
                value={linkSection}
                onChange={(e) => setLinkSection(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm mb-4"
              >
                {DAMAGE_SECTIONS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleLink}
                  disabled={createLink.isPending}
                  className="flex-1 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {createLink.isPending ? 'Linking...' : 'Link'}
                </button>
                <button
                  onClick={() => setLinkingEvidence(null)}
                  className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Case photos */}
        {isLoading ? (
          <p className="text-sm text-slate py-4">Loading photos…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-slate py-4">No photos in case evidence yet. Upload above or add via the Evidence tab.</p>
        ) : (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Case photos</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p) => {
                const isLinked = linkedIds.has(p.id)
                const link = assessment.report_evidence_links?.find((l) => l.evidence_id === p.id)
                const sectionLabel = link ? DAMAGE_SECTIONS.find((s) => s.key === link.report_section)?.label ?? link.report_section : null

                return (
                  <div key={p.id} className="relative group border border-[#D4CFC7] rounded-lg overflow-hidden bg-[#FAFAF8] aspect-square">
                    {imageUrls[p.id] ? (
                      <img src={imageUrls[p.id]} alt={p.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-slate/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {isLinked ? (
                        <button
                          onClick={() => link && deleteLink.mutate(link.id)}
                          className="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white"
                          title="Unlink from report"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setLinkingEvidence(p)}
                          className="p-2 bg-white/90 rounded-lg text-copper hover:bg-white"
                          title="Link to damage area"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {sectionLabel && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                        {sectionLabel}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Linked by section */}
        {assessment.report_evidence_links && assessment.report_evidence_links.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#D4CFC7]">
            <h4 className="text-xs font-semibold text-slate uppercase tracking-wide mb-3">Linked to report sections</h4>
            <div className="space-y-2">
              {DAMAGE_SECTIONS.map((s) => {
                const links = getLinksForSection(s.key)
                if (links.length === 0) return null
                return (
                  <div key={s.key} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-charcoal w-28">{s.label}:</span>
                    <span className="text-slate">{links.length} photo(s)</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onNavigate('outcome')}
          className="px-5 py-2 border border-copper text-copper rounded-lg text-sm font-medium hover:bg-copper/5 transition-colors"
        >
          Outcome & Financials →
        </button>
      </div>
    </div>
  )
}
