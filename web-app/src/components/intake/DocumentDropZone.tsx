'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { ExtractionReviewPanel } from './ExtractionReviewPanel'
import type { IntakeExtractionResult } from '@/app/api/intake/process/route'

const DEFAULT_ACCEPTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
]

const DEFAULT_EXTENSIONS = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.tiff'

interface DocumentDropZoneProps {
  caseId: string
  assessmentId?: string
  documentRole: string
  vertical: string
  label?: string
  acceptedTypes?: string[]
  onComplete?: (result: IntakeExtractionResult) => void
}

type Phase = 'idle' | 'uploading' | 'review' | 'done' | 'error'

export function DocumentDropZone({
  caseId,
  assessmentId,
  documentRole,
  vertical,
  label,
  acceptedTypes,
  onComplete,
}: DocumentDropZoneProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<IntakeExtractionResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptStr = (acceptedTypes ?? DEFAULT_ACCEPTED).join(',')

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name)
      setPhase('uploading')
      setErrorMessage(null)
      setResult(null)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('caseId', caseId)
        formData.append('documentRole', documentRole)
        formData.append('vertical', vertical)
        if (assessmentId) formData.append('assessmentId', assessmentId)

        const response = await fetch('/api/intake/process', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Processing failed' }))
          throw new Error(err.error || 'Document processing failed')
        }

        const data: IntakeExtractionResult = await response.json()
        setResult(data)

        if (Object.keys(data.extracted_fields).length > 0) {
          setPhase('review')
        } else {
          setPhase('done')
          onComplete?.(data)
        }
      } catch (err: unknown) {
        setPhase('error')
        setErrorMessage(err instanceof Error ? err.message : 'Failed to process document')
      }
    },
    [caseId, assessmentId, documentRole, vertical, onComplete],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      e.target.value = ''
    },
    [processFile],
  )

  const handleConfirm = useCallback(
    (fields: Record<string, string>) => {
      if (result) {
        const enriched: IntakeExtractionResult = {
          ...result,
          extracted_fields: Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [
              k,
              result.extracted_fields[k]
                ? { ...result.extracted_fields[k], value: v }
                : { value: v, confidence: 'high' as const, source: 'manual' },
            ]),
          ),
        }
        setPhase('done')
        onComplete?.(enriched)
      }
    },
    [result, onComplete],
  )

  const handleReExtract = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [])

  const reset = () => {
    setPhase('idle')
    setFileName(null)
    setErrorMessage(null)
    setResult(null)
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleInput}
        className="hidden"
      />

      {/* Idle — drop zone */}
      {phase === 'idle' && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragActive
              ? 'border-copper bg-copper/5'
              : 'border-[#D4CFC7] hover:border-copper/50 hover:bg-[#FAFAF8]'
          }`}
        >
          <Upload
            className={`w-8 h-8 ${dragActive ? 'text-copper' : 'text-slate/40'}`}
          />
          <div className="text-center">
            <p className="text-sm font-medium text-charcoal">
              {label ?? 'Drop a document here or click to browse'}
            </p>
            <p className="text-xs text-slate mt-1">
              PDF, Word, image or text — fields are extracted automatically
            </p>
          </div>
        </div>
      )}

      {/* Uploading / processing */}
      {phase === 'uploading' && (
        <div className="border-2 border-dashed border-copper/40 rounded-xl p-6 flex flex-col items-center gap-3 bg-copper/5">
          <Loader2 className="w-8 h-8 text-copper animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-charcoal">
              Processing document…
            </p>
            <p className="text-xs text-slate mt-1">{fileName}</p>
          </div>
        </div>
      )}

      {/* Review extracted fields */}
      {phase === 'review' && result && (
        <div className="border rounded-xl p-4 bg-white shadow-sm">
          <ExtractionReviewPanel
            result={result}
            onConfirm={handleConfirm}
            onReExtract={handleReExtract}
            onCancel={reset}
          />
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="border-2 border-emerald-300 rounded-xl p-4 flex items-center gap-3 bg-emerald-50">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">
              Document processed
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {fileName} —{' '}
              {result
                ? `${Object.keys(result.extracted_fields).length} fields extracted`
                : 'No fields found'}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-emerald-700 underline hover:no-underline"
          >
            replace
          </button>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 bg-red-50">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              Processing failed
            </p>
            <p className="text-xs text-red-500 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-red-600 underline hover:no-underline"
          >
            retry
          </button>
        </div>
      )}
    </div>
  )
}
