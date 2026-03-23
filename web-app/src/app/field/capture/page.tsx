'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, ImageIcon, FileText, MapPin, X, Upload, Check, CloudOff } from 'lucide-react'
import { useCases } from '@/hooks/use-cases'
import { useFieldUploadQueue } from '@/hooks/use-field-upload-queue'
import { startQueueProcessor } from '@/lib/upload/field-queue-processor'
import type { Case } from '@/lib/types/case'

const PRESET_TAGS = [
  'FRONT', 'REAR', 'LEFT', 'RIGHT', 'VIN', 'ODOMETER', 'UNDERCARRIAGE',
  'ENGINE', 'INTERIOR', 'CHASSIS', 'DAMAGE_CLOSEUP', 'DAMAGE_WIDE',
  'STATEMENT', 'QUOTE', 'INVOICE',
] as const

interface PreviewFile {
  file: File
  previewUrl: string
  isImage: boolean
}

interface GeoLocation {
  lat: number
  lng: number
}

export default function FieldCapturePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [customTag, setCustomTag] = useState('')
  const [notes, setNotes] = useState('')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'capturing' | 'success' | 'failed'>('idle')
  const [geoLocation, setGeoLocation] = useState<GeoLocation | null>(null)
  const [queueStatus, setQueueStatus] = useState<'idle' | 'queued' | 'error'>('idle')
  const [queueError, setQueueError] = useState<string | null>(null)

  const { data: allCases = [] } = useCases()
  const { enqueue, stats } = useFieldUploadQueue()

  // Start queue processor once on mount
  useEffect(() => {
    return startQueueProcessor()
  }, [])

  // Capture GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus('failed'); return }
    setGeoStatus('capturing')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('success')
      },
      () => setGeoStatus('failed'),
      { timeout: 10_000, enableHighAccuracy: true }
    )
  }, [])

  const recentCases = [...allCases]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const next: PreviewFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    }))
    setPreviews((prev) => [...prev, ...next])
  }, [])

  const removePreview = useCallback((index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }, [])

  const addCustomTag = () => {
    const tag = customTag.trim().toUpperCase()
    if (!tag) return
    setActiveTags((prev) => new Set([...prev, tag]))
    setCustomTag('')
  }

  const handleQueue = async () => {
    if (previews.length === 0 || !selectedCaseId) return
    setQueueError(null)

    const tags = Array.from(activeTags)
    const capturedAt = new Date().toISOString()

    try {
      for (const { file, previewUrl } of previews) {
        const mediaType = file.type.startsWith('image/')
          ? 'photo'
          : file.type.startsWith('video/')
            ? 'video'
            : 'document'

        await enqueue({
          localFileUri: previewUrl,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          mediaType,
          caseId: selectedCaseId,
          orgId: '', // resolved server-side from session
          tags,
          notes: notes.trim(),
          capturedAt,
          locationLat: geoLocation?.lat,
          locationLng: geoLocation?.lng,
        })
      }

      setQueueStatus('queued')
      setPreviews([])
      setNotes('')
      ;[cameraInputRef, galleryInputRef, documentInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = ''
      })
      setTimeout(() => setQueueStatus('idle'), 3_000)
    } catch (err) {
      setQueueStatus('error')
      setQueueError(err instanceof Error ? err.message : 'Failed to queue files')
    }
  }

  const pendingCount = stats.pending + stats.uploading
  const failedCount = stats.failed

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      <h1 className="text-lg font-bold text-charcoal">Capture</h1>

      {/* Queue status banner */}
      {(pendingCount > 0 || failedCount > 0) && (
        <div role="status" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          failedCount > 0
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {failedCount > 0
            ? <CloudOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            : (
              <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )
          }
          {failedCount > 0
            ? `${failedCount} upload${failedCount > 1 ? 's' : ''} failed — will retry when online`
            : `${pendingCount} file${pendingCount > 1 ? 's' : ''} uploading in background…`
          }
        </div>
      )}

      {/* GPS indicator */}
      <div className="flex items-center gap-1.5 text-xs" aria-live="polite">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
        {geoStatus === 'capturing' && <span className="text-muted">Capturing location…</span>}
        {geoStatus === 'success' && geoLocation && (
          <span className="text-green-600 font-medium">
            📍 Location captured ({geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)})
          </span>
        )}
        {geoStatus === 'failed' && <span className="text-muted">📍 Location unavailable</span>}
      </div>

      {/* Trigger buttons */}
      <div className="grid grid-cols-3 gap-2">
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*,application/pdf"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={documentInputRef} type="file"
          accept=".pdf,.doc,.docx,.xlsx,.jpg,.png"
          multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {[
          { ref: cameraInputRef, Icon: Camera, label: 'Take Photo', ariaLabel: 'Take photo with camera' },
          { ref: galleryInputRef, Icon: ImageIcon, label: 'Gallery', ariaLabel: 'Choose from gallery' },
          { ref: documentInputRef, Icon: FileText, label: 'Document', ariaLabel: 'Upload document' },
        ].map(({ ref, Icon, label, ariaLabel }) => (
          <button
            key={label}
            onClick={() => ref.current?.click()}
            aria-label={ariaLabel}
            className="flex flex-col items-center gap-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl py-4 hover:border-[#C72A00] active:bg-[#F5F2EE] transition-colors"
          >
            <Icon className="w-6 h-6 text-[#C72A00]" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-[11px] font-medium text-charcoal">{label}</span>
          </button>
        ))}
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Selected ({previews.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((item, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {item.isImage
                  ? ( // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 gap-0.5">
                      <FileText className="w-6 h-6 text-muted" strokeWidth={1.25} aria-hidden="true" />
                      <span className="text-[9px] text-muted text-center line-clamp-2 leading-tight">{item.file.name}</span>
                    </div>
                  )
                }
                <button onClick={() => removePreview(idx)}
                  aria-label={`Remove ${item.file.name}`}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case selector */}
      <div>
        <label htmlFor="capture-case-select" className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Case
        </label>
        <select id="capture-case-select" value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00] transition-colors">
          <option value="">Select a case…</option>
          {recentCases.map((c: Case) => (
            <option key={c.id} value={c.id}>{c.case_number} — {c.client_name}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Evidence tags">
          {PRESET_TAGS.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)} aria-pressed={activeTags.has(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                activeTags.has(tag)
                  ? 'bg-[#C72A00] text-white border-[#C72A00]'
                  : 'bg-white text-slate border-[#D4CFC7] hover:border-[#C72A00]'
              }`}>
              {tag}
            </button>
          ))}
          {[...activeTags].filter((t) => !(PRESET_TAGS as readonly string[]).includes(t)).map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)} aria-pressed={true}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[#C72A00] text-white border-[#C72A00]">
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input type="text" value={customTag} aria-label="Custom tag"
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Custom tag…"
            className="flex-1 px-3 py-2 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-xs text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00]" />
          <button onClick={addCustomTag} aria-label="Add custom tag"
            className="px-3 py-2 bg-[#C72A00] text-white rounded-lg text-xs font-semibold">
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="capture-notes" className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Notes (optional)
        </label>
        <textarea id="capture-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} placeholder="Add notes about this evidence…"
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] resize-none" />
      </div>

      {/* Error */}
      {queueStatus === 'error' && queueError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {queueError}
        </div>
      )}

      {/* Queue button */}
      <button onClick={handleQueue}
        disabled={previews.length === 0 || !selectedCaseId}
        aria-label={previews.length > 0 ? `Queue ${previews.length} file${previews.length > 1 ? 's' : ''} for upload` : 'Select files to upload'}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
          previews.length === 0 || !selectedCaseId
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : queueStatus === 'queued'
              ? 'bg-green-600 text-white'
              : 'bg-[#C72A00] text-white hover:bg-[#a82300] active:scale-[0.98]'
        }`}>
        {queueStatus === 'queued'
          ? <><Check className="w-4 h-4" aria-hidden="true" /> Queued for upload</>
          : <><Upload className="w-4 h-4" aria-hidden="true" />
              {previews.length > 0 ? `Queue ${previews.length} file${previews.length > 1 ? 's' : ''}` : 'Queue for upload'}
            </>
        }
      </button>

      {queueStatus === 'queued' && (
        <p className="text-center text-xs text-muted">
          Files upload automatically — even if you leave this screen.
        </p>
      )}
    </div>
  )
}
