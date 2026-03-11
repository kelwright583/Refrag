/**
 * Case evidence page
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  useEvidence,
  useUploadEvidence,
  useDeleteEvidence,
  useUpdateEvidence,
} from '@/hooks/use-evidence'
import { getEvidenceSignedUrl } from '@/lib/api/evidence'
import { Upload, X, Image, Video, FileText, Tag, Edit2, Trash2, Sparkles, AlertTriangle } from 'lucide-react'
import { EvidenceWithTags } from '@/lib/types/evidence'
import { useClassifyEvidence, useAssessDamage } from '@/hooks/use-ai'

const SUGGESTED_TAGS = [
  'VIN',
  'ODOMETER',
  'FRONT',
  'REAR',
  'LEFT',
  'RIGHT',
  'UNDERCARRIAGE',
  'ENGINE',
  'INTERIOR',
  'CHASSIS',
  'DAMAGE_CLOSEUP',
  'DAMAGE_WIDE',
]

export default function CaseEvidencePage() {
  const params = useParams()
  const caseId = params.id as string
  const [dragActive, setDragActive] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithTags | null>(null)
  const [viewingUrl, setViewingUrl] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  const { data: evidence, isLoading } = useEvidence(caseId)
  const uploadEvidence = useUploadEvidence()
  const deleteEvidence = useDeleteEvidence()
  const classifyEvidence = useClassifyEvidence()
  const assessDamage = useAssessDamage()
  const [aiResults, setAiResults] = useState<Record<string, any>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})

  // Load signed URLs for images
  useEffect(() => {
    if (evidence) {
      const loadUrls = async () => {
        const urls: Record<string, string> = {}
        for (const item of evidence) {
          if (item.media_type === 'photo') {
            try {
              const url = await getEvidenceSignedUrl(caseId, item.id)
              urls[item.id] = url
            } catch (error) {
              // Ignore errors
            }
        }
        }
        setImageUrls(urls)
      }
      loadUrls()
    }
  }, [evidence, caseId])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      for (const file of files) {
        await handleFileUpload(file)
      }
    },
    [caseId]
  )

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files)
        for (const file of files) {
          await handleFileUpload(file)
        }
      }
    },
    [caseId]
  )

  const handleFileUpload = async (file: File) => {
    try {
      // Determine media type from file type
      let mediaType: 'photo' | 'video' | 'document' = 'document'
      if (file.type.startsWith('image/')) {
        mediaType = 'photo'
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video'
      }

      await uploadEvidence.mutateAsync({
        caseId,
        file,
        mediaType,
        options: {
          capturedAt: new Date().toISOString(),
        },
      })
    } catch (error: any) {
      alert(error.message || 'Failed to upload file')
    }
  }

  const handleDelete = async (evidenceId: string) => {
    if (confirm('Are you sure you want to delete this evidence?')) {
      try {
        await deleteEvidence.mutateAsync({ caseId, evidenceId })
      } catch (error: any) {
        alert(error.message || 'Failed to delete evidence')
      }
    }
  }

  const handleClassify = async (evidenceItem: EvidenceWithTags) => {
    const url = imageUrls[evidenceItem.id]
    if (!url) { alert('Image not loaded yet'); return }
    setAiLoading((prev) => ({ ...prev, [`classify-${evidenceItem.id}`]: true }))
    try {
      const result = await classifyEvidence.mutateAsync({
        evidence_id: evidenceItem.id,
        case_id: caseId,
        image_url: url,
      })
      setAiResults((prev) => ({ ...prev, [`classify-${evidenceItem.id}`]: result }))
    } catch (err: any) {
      alert(err.message || 'Classification failed')
    } finally {
      setAiLoading((prev) => ({ ...prev, [`classify-${evidenceItem.id}`]: false }))
    }
  }

  const handleAssessDamage = async (evidenceItem: EvidenceWithTags) => {
    const url = imageUrls[evidenceItem.id]
    if (!url) { alert('Image not loaded yet'); return }
    setAiLoading((prev) => ({ ...prev, [`damage-${evidenceItem.id}`]: true }))
    try {
      const result = await assessDamage.mutateAsync({
        evidence_id: evidenceItem.id,
        case_id: caseId,
        image_url: url,
      })
      setAiResults((prev) => ({ ...prev, [`damage-${evidenceItem.id}`]: result }))
    } catch (err: any) {
      alert(err.message || 'Damage assessment failed')
    } finally {
      setAiLoading((prev) => ({ ...prev, [`damage-${evidenceItem.id}`]: false }))
    }
  }

  const handleView = async (evidence: EvidenceWithTags) => {
    try {
      const url = await getEvidenceSignedUrl(caseId, evidence.id)
      setViewingUrl(url)
    } catch (error: any) {
      alert(error.message || 'Failed to load evidence')
    }
  }

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'photo':
        return <Image className="w-6 h-6" />
      case 'video':
        return <Video className="w-6 h-6" />
      default:
        return <FileText className="w-6 h-6" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-heading font-bold text-charcoal mb-6">Evidence</h1>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center mb-8 transition-colors ${
          dragActive
            ? 'border-copper bg-copper/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 text-slate mx-auto mb-4" />
        <p className="text-charcoal font-medium mb-2">
          Drag and drop files here, or click to select
        </p>
        <p className="text-sm text-slate mb-4">
          Supports photos, videos, and documents
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileInput}
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 cursor-pointer transition-opacity"
        >
          Select Files
        </label>
      </div>

      {/* Evidence Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading evidence...</p>
        </div>
      ) : evidence && evidence.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="aspect-video bg-gray-100 flex items-center justify-center cursor-pointer"
                onClick={() => handleView(item)}
              >
                {item.media_type === 'photo' && imageUrls[item.id] ? (
                  <img
                    src={imageUrls[item.id]}
                    alt={item.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate">{getMediaIcon(item.media_type)}</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-charcoal mb-2 truncate">
                  {item.file_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate mb-2">
                  {getMediaIcon(item.media_type)}
                  <span>{formatFileSize(item.file_size)}</span>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-slate text-xs rounded"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-slate">+{item.tags.length - 3} more</span>
                    )}
                  </div>
                )}
                {item.notes && (
                  <p className="text-sm text-slate mb-3 line-clamp-2">{item.notes}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedEvidence(item)
                      setShowEditModal(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
                {/* AI Actions */}
                {item.media_type === 'photo' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleClassify(item)}
                      disabled={aiLoading[`classify-${item.id}`]}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiLoading[`classify-${item.id}`] ? 'Classifying...' : 'AI Classify'}
                    </button>
                    <button
                      onClick={() => handleAssessDamage(item)}
                      disabled={aiLoading[`damage-${item.id}`]}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {aiLoading[`damage-${item.id}`] ? 'Assessing...' : 'Assess Damage'}
                    </button>
                  </div>
                )}
                {/* AI Results */}
                {aiResults[`classify-${item.id}`] && (
                  <div className="mt-2 p-2 bg-purple-50 rounded-lg text-xs">
                    <p className="font-medium text-purple-800">
                      {aiResults[`classify-${item.id}`].label}
                    </p>
                    <p className="text-purple-600">
                      Confidence: {aiResults[`classify-${item.id}`].confidence}
                    </p>
                    {aiResults[`classify-${item.id}`].notes && (
                      <p className="text-purple-500 mt-1">{aiResults[`classify-${item.id}`].notes}</p>
                    )}
                  </div>
                )}
                {aiResults[`damage-${item.id}`] && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs">
                    <p className="font-medium text-amber-800 capitalize">
                      Severity: {aiResults[`damage-${item.id}`].severity}
                    </p>
                    <p className="text-amber-700">
                      {aiResults[`damage-${item.id}`].affected_area}
                    </p>
                    <p className="text-amber-600">
                      Repair: {aiResults[`damage-${item.id}`].estimated_repair_type}
                    </p>
                    {aiResults[`damage-${item.id}`].flags?.length > 0 && (
                      <div className="mt-1">
                        {aiResults[`damage-${item.id}`].flags.map((flag: string, i: number) => (
                          <p key={i} className="text-red-600">⚠ {flag}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-charcoal font-medium mb-1">No evidence yet</p>
          <p className="text-slate text-sm">
            Upload files to get started
          </p>
        </div>
      )}

      {/* View Modal */}
      {viewingUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingUrl(null)}
        >
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-charcoal">
                {selectedEvidence?.file_name || 'Evidence'}
              </h3>
              <button
                onClick={() => setViewingUrl(null)}
                className="text-slate hover:text-charcoal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <img src={viewingUrl} alt="Evidence" className="max-w-full max-h-[70vh] mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEvidence && (
        <EditEvidenceModal
          caseId={caseId}
          evidence={selectedEvidence}
          onClose={() => {
            setShowEditModal(false)
            setSelectedEvidence(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * Edit Evidence Modal Component
 */
function EditEvidenceModal({
  caseId,
  evidence,
  onClose,
}: {
  caseId: string
  evidence: EvidenceWithTags
  onClose: () => void
}) {
  const [notes, setNotes] = useState(evidence.notes || '')
  const [tags, setTags] = useState<string[]>(evidence.tags || [])
  const [customTag, setCustomTag] = useState('')
  const updateEvidence = useUpdateEvidence()

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag))
    } else {
      setTags([...tags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()])
      setCustomTag('')
    }
  }

  const handleSave = async () => {
    try {
      await updateEvidence.mutateAsync({
        caseId,
        evidenceId: evidence.id,
        updates: { notes, tags },
      })
      onClose()
    } catch (error: any) {
      alert(error.message || 'Failed to update evidence')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Edit Evidence</h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="Add notes about this evidence..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    tags.includes(tag)
                      ? 'bg-copper text-white'
                      : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                placeholder="Add custom tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              />
              <button
                onClick={addCustomTag}
                className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-copper/10 text-copper text-sm rounded"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="hover:text-copper/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-charcoal hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateEvidence.isPending}
            className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updateEvidence.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
