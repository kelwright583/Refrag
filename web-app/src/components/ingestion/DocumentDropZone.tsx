'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useIngestDocument } from '@/hooks/use-ingestion'
import type { ExtractionResult, DocumentIngestionInput } from '@/lib/types/ingestion'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
]

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.tiff'

const DOC_TYPE_LABELS: Record<string, string> = {
  motor_assessment_instruction: 'Motor Assessment Instruction',
  repairer_quote: 'Repairer / Labour Quote',
  parts_quote: 'Parts Quotation',
  mm_valuation: 'MM Codes / Valuation',
  unknown: 'Document',
}

interface Props {
  /** Called when extraction completes successfully */
  onExtracted: (result: ExtractionResult) => void
  /** Optional context for the API */
  context?: Omit<DocumentIngestionInput, 'file'>
  /** Label shown on the drop zone */
  label?: string
  /** Small mode — compact inline version */
  compact?: boolean
}

type State = 'idle' | 'uploading' | 'done' | 'error'

export function DocumentDropZone({ onExtracted, context, label, compact = false }: Props) {
  const [state, setState] = useState<State>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [docType, setDocType] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ingest = useIngestDocument()

  const process = useCallback(
    async (file: File) => {
      setFileName(file.name)
      setState('uploading')
      setErrorMessage(null)
      try {
        const result = await ingest.mutateAsync({ file, ...context })
        setDocType(result.document_type)
        setState('done')
        onExtracted(result)
      } catch (err: any) {
        setState('error')
        setErrorMessage(err.message || 'Failed to process document')
      }
    },
    [ingest, context, onExtracted]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) process(file)
    },
    [process]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) process(file)
      e.target.value = ''
    },
    [process]
  )

  const reset = () => {
    setState('idle')
    setFileName(null)
    setDocType(null)
    setErrorMessage(null)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleInput} className="hidden" />
        {state === 'idle' && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#D4CFC7] rounded-lg text-sm text-slate hover:border-copper hover:text-copper transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {label ?? 'Import from document'}
          </button>
        )}
        {state === 'uploading' && (
          <span className="inline-flex items-center gap-2 text-sm text-amber-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Extracting…
          </span>
        )}
        {state === 'done' && (
          <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" />
            {DOC_TYPE_LABELS[docType ?? ''] ?? 'Document'} extracted
            <button onClick={reset} className="text-xs underline text-slate">replace</button>
          </span>
        )}
        {state === 'error' && (
          <span className="inline-flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMessage}
            <button onClick={reset} className="text-xs underline">retry</button>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleInput} className="hidden" />

      {state === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragActive ? 'border-copper bg-copper/5' : 'border-[#D4CFC7] hover:border-copper/50 hover:bg-[#FAFAF8]'
          }`}
        >
          <Upload className={`w-8 h-8 ${dragActive ? 'text-copper' : 'text-slate/40'}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-charcoal">{label ?? 'Drop a document here or click to browse'}</p>
            <p className="text-xs text-slate mt-1">PDF, Word (.docx), image or plain text — AI extracts all available fields</p>
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="border-2 border-dashed border-copper/40 rounded-xl p-6 flex flex-col items-center gap-3 bg-copper/5">
          <Loader2 className="w-8 h-8 text-copper animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-charcoal">Extracting fields…</p>
            <p className="text-xs text-slate mt-1">{fileName}</p>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="border-2 border-emerald-300 rounded-xl p-4 flex items-center gap-3 bg-emerald-50">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">
              {DOC_TYPE_LABELS[docType ?? ''] ?? 'Document'} detected
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{fileName} — fields populated below. Review and confirm.</p>
          </div>
          <button onClick={reset} className="text-xs text-emerald-700 underline hover:no-underline">replace</button>
        </div>
      )}

      {state === 'error' && (
        <div className="border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 bg-red-50">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Extraction failed</p>
            <p className="text-xs text-red-500 mt-0.5">{errorMessage}</p>
          </div>
          <button onClick={reset} className="text-xs text-red-600 underline">retry</button>
        </div>
      )}
    </div>
  )
}
