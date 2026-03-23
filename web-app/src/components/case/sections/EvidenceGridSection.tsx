'use client'

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from 'react'
import {
  ImageIcon,
  Upload,
  Camera,
  X,
  Eye,
  Tag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react'
import { useEvidence, useUploadEvidence, useUpdateEvidence, useDeleteEvidence } from '@/hooks/use-evidence'
import { EvidenceWithTags } from '@/lib/types/evidence'
import { getEvidenceSignedUrl } from '@/lib/api/evidence'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type FilterType = 'all' | 'photo' | 'video' | 'document'

interface UploadingFile {
  id: string
  name: string
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface TagModalState {
  evidence: EvidenceWithTags
  customTag: string
}

const SUGGESTED_TAGS = ['Damage', 'Interior', 'Exterior', 'Engine', 'Scene', 'Documents', 'Third Party']

function EvidenceCard({
  item,
  onView,
  onTag,
  onDelete,
}: {
  item: EvidenceWithTags & { signedUrl?: string }
  onView: () => void
  onTag: () => void
  onDelete: () => void
}) {
  const isImage = item.media_type === 'photo'
  const isVideo = item.media_type === 'video'

  return (
    <div className="relative group rounded-lg overflow-hidden border border-[#D4CFC7] aspect-square bg-[#FAFAF8]">
      {isImage && item.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.signedUrl} alt={item.file_name} className="w-full h-full object-cover" />
      ) : isVideo ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate">
          <Video className="w-8 h-8" />
          <span className="text-xs text-center px-2 line-clamp-2">{item.file_name}</span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate">
          <FileText className="w-8 h-8" />
          <span className="text-xs text-center px-2 line-clamp-2">{item.file_name}</span>
        </div>
      )}

      {/* AI tag chips */}
      {item.tags.length > 0 && (
        <div className="absolute bottom-1 left-1 flex flex-wrap gap-0.5">
          {item.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-black/50 text-white px-1 rounded">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
        {isImage && (
          <button
            onClick={onView}
            title="View"
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onTag}
          title="Tag"
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 bg-red-500/70 hover:bg-red-500/90 rounded-full text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function EvidenceGridSection({ caseId }: SectionProps) {
  const { data: evidence, isLoading, isError, refetch } = useEvidence(caseId)
  const uploadMutation = useUploadEvidence()
  const updateMutation = useUpdateEvidence()
  const deleteMutation = useDeleteEvidence()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [filter, setFilter] = useState<FilterType>('all')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [lightboxItem, setLightboxItem] = useState<(EvidenceWithTags & { signedUrl?: string }) | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [tagModal, setTagModal] = useState<TagModalState | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const requestedIds = useRef<Set<string>>(new Set())

  // Load signed URLs for photos
  useEffect(() => {
    if (!evidence) return
    evidence.forEach((item) => {
      if (item.media_type === 'photo' && !requestedIds.current.has(item.id)) {
        requestedIds.current.add(item.id)
        getEvidenceSignedUrl(caseId, item.id)
          .then((url) => setSignedUrls((prev) => ({ ...prev, [item.id]: url })))
          .catch(() => requestedIds.current.delete(item.id))
      }
    })
  }, [evidence, caseId])

  const enrichedEvidence = (evidence || []).map((item) => ({
    ...item,
    signedUrl: signedUrls[item.id],
  }))

  const filtered = enrichedEvidence.filter((item) =>
    filter === 'all' ? true : item.media_type === filter
  )

  const photoItems = enrichedEvidence.filter((item) => item.media_type === 'photo')

  function getMediaType(file: File): 'photo' | 'video' | 'document' {
    if (file.type.startsWith('image/')) return 'photo'
    if (file.type.startsWith('video/')) return 'video'
    return 'document'
  }

  async function uploadFiles(files: File[]) {
    const queue: UploadingFile[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      status: 'uploading',
    }))
    setUploadingFiles((prev) => [...prev, ...queue])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const queueItem = queue[i]
      try {
        await uploadMutation.mutateAsync({
          caseId,
          file,
          mediaType: getMediaType(file),
        })
        setUploadingFiles((prev) =>
          prev.map((u) => (u.id === queueItem.id ? { ...u, status: 'done' } : u))
        )
      } catch (err: any) {
        setUploadingFiles((prev) =>
          prev.map((u) =>
            u.id === queueItem.id ? { ...u, status: 'error', error: err.message } : u
          )
        )
      }
    }

    // Clear done items after a delay
    setTimeout(() => {
      setUploadingFiles((prev) => prev.filter((u) => u.status === 'error'))
    }, 2000)
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function onDragLeave() {
    setIsDragOver(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFiles(files)
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }

  function openLightbox(item: EvidenceWithTags & { signedUrl?: string }) {
    const idx = photoItems.findIndex((p) => p.id === item.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxItem(item)
  }

  function closeLightbox() {
    setLightboxItem(null)
  }

  function prevLightbox() {
    const newIdx = (lightboxIndex - 1 + photoItems.length) % photoItems.length
    setLightboxIndex(newIdx)
    setLightboxItem(photoItems[newIdx])
  }

  function nextLightbox() {
    const newIdx = (lightboxIndex + 1) % photoItems.length
    setLightboxIndex(newIdx)
    setLightboxItem(photoItems[newIdx])
  }

  async function saveTagModal() {
    if (!tagModal) return
    const tags = [...tagModal.evidence.tags]
    if (tagModal.customTag.trim() && !tags.includes(tagModal.customTag.trim())) {
      tags.push(tagModal.customTag.trim())
    }
    await updateMutation.mutateAsync({
      caseId,
      evidenceId: tagModal.evidence.id,
      updates: { tags },
    })
    setTagModal(null)
  }

  function toggleSuggestedTag(tag: string) {
    if (!tagModal) return
    const tags = tagModal.evidence.tags.includes(tag)
      ? tagModal.evidence.tags.filter((t) => t !== tag)
      : [...tagModal.evidence.tags, tag]
    setTagModal({ ...tagModal, evidence: { ...tagModal.evidence, tags } })
  }

  async function confirmDelete(evidenceId: string) {
    await deleteMutation.mutateAsync({ caseId, evidenceId })
    setDeleteConfirm(null)
  }

  const uploadingCount = uploadingFiles.filter((u) => u.status === 'uploading').length

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {['All', 'Photos', 'Videos', 'Documents'].map((label) => (
            <div key={label} className="h-8 w-20 rounded-full bg-[#D4CFC7] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-[#D4CFC7] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-slate">Failed to load evidence</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'photo', label: 'Photos' },
    { key: 'video', label: 'Videos' },
    { key: 'document', label: 'Documents' },
  ]

  return (
    <div className="space-y-4">
      {/* Upload progress banner */}
      {uploadingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-copper/10 border border-copper/20 rounded-lg text-sm text-copper">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading {uploadingCount} file{uploadingCount !== 1 ? 's' : ''}...
        </div>
      )}

      {/* Error uploads */}
      {uploadingFiles.filter((u) => u.status === 'error').map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to upload {u.name}: {u.error}</span>
          </div>
          <button
            onClick={() => setUploadingFiles((prev) => prev.filter((x) => x.id !== u.id))}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-copper text-white'
                : 'bg-[#FAFAF8] border border-[#D4CFC7] text-slate hover:border-copper hover:text-copper'
            }`}
          >
            {label}
            {key !== 'all' && evidence && (
              <span className="ml-1 text-xs opacity-70">
                ({evidence.filter((e) => e.media_type === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg text-slate hover:border-copper hover:text-copper transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg text-slate hover:border-copper hover:text-copper transition-colors md:hidden"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Drop zone + grid */}
      {filtered.length === 0 ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-copper bg-copper/5'
              : 'border-[#D4CFC7] bg-[#FAFAF8] hover:border-copper/50'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-slate" />
          <p className="text-sm font-medium text-charcoal">Drop files here or click to upload</p>
          <p className="text-xs text-slate mt-1">Photos, videos, PDFs, documents</p>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`grid grid-cols-2 md:grid-cols-3 gap-3 p-2 rounded-lg transition-colors ${
            isDragOver ? 'bg-copper/5 ring-2 ring-copper ring-dashed' : ''
          }`}
        >
          {filtered.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              onView={() => openLightbox(item)}
              onTag={() => setTagModal({ evidence: item, customTag: '' })}
              onDelete={() => setDeleteConfirm(item.id)}
            />
          ))}
          {/* Upload tile */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-lg border-2 border-dashed border-[#D4CFC7] aspect-square bg-[#FAFAF8] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-copper hover:bg-copper/5 transition-colors"
          >
            <Plus className="w-6 h-6 text-slate" />
            <span className="text-xs text-slate">Add more</span>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxItem.signedUrl || ''}
            alt={lightboxItem.file_name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-70 transition-opacity"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          {photoItems.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); prevLightbox() }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); nextLightbox() }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {photoItems.length}
          </div>
        </div>
      )}

      {/* Tag modal */}
      {tagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTagModal(null)}>
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-charcoal">Tag Evidence</h3>
              <button onClick={() => setTagModal(null)} className="text-slate hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate mb-2">Suggested tags:</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleSuggestedTag(tag)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    tagModal.evidence.tags.includes(tag)
                      ? 'bg-copper text-white'
                      : 'bg-[#FAFAF8] border border-[#D4CFC7] text-slate hover:border-copper'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate mb-1">Custom tag:</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={tagModal.customTag}
                onChange={(e) => setTagModal({ ...tagModal, customTag: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagModal.customTag.trim()) {
                    toggleSuggestedTag(tagModal.customTag.trim())
                    setTagModal({ ...tagModal, customTag: '' })
                  }
                }}
                placeholder="Type a tag..."
                className="flex-1 px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
              />
              <button
                onClick={() => {
                  if (tagModal.customTag.trim()) {
                    toggleSuggestedTag(tagModal.customTag.trim())
                    setTagModal({ ...tagModal, customTag: '' })
                  }
                }}
                className="px-3 py-2 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-slate hover:border-copper transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tagModal.evidence.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tagModal.evidence.tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 px-2 py-0.5 bg-copper/10 text-copper rounded text-xs"
                  >
                    {t}
                    <button onClick={() => toggleSuggestedTag(t)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTagModal(null)}
                className="px-4 py-2 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:border-copper transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTagModal}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Tags'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-charcoal mb-2">Delete Evidence</h3>
            <p className="text-sm text-slate mb-4">
              Are you sure you want to permanently delete this item?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:border-copper transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
