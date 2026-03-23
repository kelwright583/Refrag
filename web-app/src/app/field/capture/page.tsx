'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, ImageIcon, FileText, MapPin, X, Upload, Check } from 'lucide-react'
import { useCases } from '@/hooks/use-cases'
import { useUploadEvidence } from '@/hooks/use-evidence'
import type { Case } from '@/lib/types/case'

// ── Tag definitions ────────────────────────────────────────────────────────

const PRESET_TAGS = [
  'FRONT', 'REAR', 'LEFT', 'RIGHT', 'VIN', 'ODOMETER', 'UNDERCARRIAGE',
  'ENGINE', 'INTERIOR', 'CHASSIS', 'DAMAGE_CLOSEUP', 'DAMAGE_WIDE',
  'STATEMENT', 'QUOTE', 'INVOICE',
] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreviewFile {
  file: File
  previewUrl: string
  isImage: boolean
}

interface GeoLocation {
  lat: number
  lng: number
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: allCases = [] } = useCases()
  const uploadEvidence = useUploadEvidence()

  // Capture geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('failed')
      return
    }
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

  // Recent 10 cases for selector
  const recentCases = [...allCases]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newPreviews: PreviewFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    }))
    setPreviews((prev) => [...prev, ...newPreviews])
  }, [])

  const removePreview = useCallback((index: number) => {
    setPreviews((prev) => {
      const item = prev[index]
      URL.revokeObjectURL(item.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const addCustomTag = () => {
    const tag = customTag.trim().toUpperCase()
    if (!tag) return
    setActiveTags((prev) => new Set([...prev, tag]))
    setCustomTag('')
  }

  const handleUpload = async () => {
    if (previews.length === 0 || !selectedCaseId) return
    setUploadStatus('uploading')
    setUploadError(null)
    const tags = Array.from(activeTags)

    try {
      for (const { file } of previews) {
        const mediaType = file.type.startsWith('image/')
          ? 'photo'
          : file.type.startsWith('video/')
            ? 'video'
            : 'document'
        await uploadEvidence.mutateAsync({
          caseId: selectedCaseId,
          file,
          mediaType,
          options: {
            notes: notes.trim() || undefined,
            tags,
            capturedAt: new Date().toISOString(),
          },
        })
      }
      setUploadStatus('done')
      // Rapid capture: reset files but keep case + tags
      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPreviews([])
      setNotes('')
      // Reset file inputs
      ;[cameraInputRef, galleryInputRef, documentInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = ''
      })
      // Return to idle after a moment
      setTimeout(() => setUploadStatus('idle'), 2000)
    } catch (err) {
      setUploadStatus('error')
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-6">
      <h1 className="text-lg font-bold text-charcoal">Capture</h1>

      {/* Geolocation status */}
      <div className="flex items-center gap-1.5 text-xs">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted" />
        {geoStatus === 'capturing' && <span className="text-muted">Capturing location…</span>}
        {geoStatus === 'success' && geoLocation && (
          <span className="text-green-600 font-medium">
            Location captured ({geoLocation.lat.toFixed(4)}, {geoLocation.lng.toFixed(4)})
          </span>
        )}
        {geoStatus === 'failed' && <span className="text-muted">Location unavailable</span>}
      </div>

      {/* Trigger buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xlsx,.jpg,.png"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl py-4 hover:border-[#C72A00] active:bg-[#F5F2EE] transition-colors"
        >
          <Camera className="w-6 h-6 text-[#C72A00]" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-charcoal">Take Photo</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl py-4 hover:border-[#C72A00] active:bg-[#F5F2EE] transition-colors"
        >
          <ImageIcon className="w-6 h-6 text-[#C72A00]" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-charcoal">Gallery</span>
        </button>

        <button
          onClick={() => documentInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl py-4 hover:border-[#C72A00] active:bg-[#F5F2EE] transition-colors"
        >
          <FileText className="w-6 h-6 text-[#C72A00]" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-charcoal">Document</span>
        </button>
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
                {item.isImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 gap-0.5">
                    <FileText className="w-6 h-6 text-muted" strokeWidth={1.25} />
                    <span className="text-[9px] text-muted text-center line-clamp-2 leading-tight">
                      {item.file.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removePreview(idx)}
                  aria-label="Remove file"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case selector */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Case
        </label>
        <select
          value={selectedCaseId}
          onChange={(e) => setSelectedCaseId(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal outline-none focus:border-[#C72A00] transition-colors"
        >
          <option value="">Select a case…</option>
          {recentCases.map((c: Case) => (
            <option key={c.id} value={c.id}>
              {c.case_number} — {c.client_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tag chips */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                activeTags.has(tag)
                  ? 'bg-[#C72A00] text-white border-[#C72A00]'
                  : 'bg-white text-slate border-[#D4CFC7] hover:border-[#C72A00]'
              }`}
            >
              {tag}
            </button>
          ))}
          {/* Custom tags */}
          {[...activeTags].filter((t) => !(PRESET_TAGS as readonly string[]).includes(t)).map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[#C72A00] text-white border-[#C72A00] transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        {/* Custom tag input */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Custom tag…"
            className="flex-1 px-3 py-2 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-xs text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] transition-colors"
          />
          <button
            onClick={addCustomTag}
            className="px-3 py-2 bg-[#C72A00] text-white rounded-lg text-xs font-semibold"
          >
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add notes about this evidence…"
          className="w-full px-3 py-2.5 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg text-sm text-charcoal placeholder:text-muted outline-none focus:border-[#C72A00] transition-colors resize-none"
        />
      </div>

      {/* Upload error */}
      {uploadStatus === 'error' && uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {uploadError}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={previews.length === 0 || !selectedCaseId || uploadStatus === 'uploading'}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
          previews.length === 0 || !selectedCaseId
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : uploadStatus === 'done'
              ? 'bg-green-600 text-white'
              : 'bg-[#C72A00] text-white hover:bg-[#a82300] active:scale-[0.98]'
        }`}
      >
        {uploadStatus === 'uploading' ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Uploading…
          </>
        ) : uploadStatus === 'done' ? (
          <>
            <Check className="w-4 h-4" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload {previews.length > 0 ? `${previews.length} file${previews.length > 1 ? 's' : ''}` : ''}
          </>
        )}
      </button>
    </div>
  )
}
