'use client'

import { useState } from 'react'
import {
  FileText,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useEvidence, useUpdateEvidence, useDeleteEvidence } from '@/hooks/use-evidence'
import { getEvidenceSignedUrl } from '@/lib/api/evidence'
import { EvidenceWithTags } from '@/lib/types/evidence'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type DocCategory = 'all' | 'Quote' | 'Valuation' | 'Statement' | 'Mandate' | 'Correspondence' | 'Other'

const DOC_CATEGORIES: DocCategory[] = ['all', 'Quote', 'Valuation', 'Statement', 'Mandate', 'Correspondence', 'Other']

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Quote: 'bg-blue-100 text-blue-700',
  Valuation: 'bg-purple-100 text-purple-700',
  Statement: 'bg-amber-100 text-amber-700',
  Mandate: 'bg-copper/10 text-copper',
  Correspondence: 'bg-teal-100 text-teal-700',
  Other: 'bg-gray-100 text-gray-600',
}

function getDocCategory(tags: string[]): string {
  const catTags = DOC_CATEGORIES.slice(1) as string[]
  return tags.find((t) => catTags.includes(t)) || 'Other'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentLogSection({ caseId }: SectionProps) {
  const { data: evidence, isLoading, isError, refetch } = useEvidence(caseId)
  const updateMutation = useUpdateEvidence()
  const deleteMutation = useDeleteEvidence()

  const [filter, setFilter] = useState<DocCategory>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [categoryOpen, setCategoryOpen] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const documents = (evidence || [])
    .filter((e) => e.media_type === 'document')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered =
    filter === 'all'
      ? documents
      : documents.filter((doc) => getDocCategory(doc.tags) === filter)

  async function handleDownload(doc: EvidenceWithTags) {
    setDownloading(doc.id)
    try {
      const url = await getEvidenceSignedUrl(caseId, doc.id)
      window.open(url, '_blank')
    } catch {
      // silently fail
    } finally {
      setDownloading(null)
    }
  }

  async function setCategory(doc: EvidenceWithTags, category: string) {
    const otherTags = doc.tags.filter((t) => !DOC_CATEGORIES.slice(1).includes(t as DocCategory))
    await updateMutation.mutateAsync({
      caseId,
      evidenceId: doc.id,
      updates: { tags: [...otherTags, category] },
    })
    setCategoryOpen(null)
  }

  async function confirmDelete(evidenceId: string) {
    await deleteMutation.mutateAsync({ caseId, evidenceId })
    setDeleteConfirm(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-[#D4CFC7] animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-slate">Failed to load documents</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate" />
        <span className="text-sm font-medium text-charcoal">
          Document Log ({documents.length})
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {DOC_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-copper text-white'
                : 'bg-[#FAFAF8] border border-[#D4CFC7] text-slate hover:border-copper hover:text-copper'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
            {cat !== 'all' && (
              <span className="ml-1 text-xs opacity-70">
                ({documents.filter((d) => getDocCategory(d.tags) === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate" />
          <p className="text-sm text-slate">No documents attached yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((doc) => {
            const category = getDocCategory(doc.tags)
            const badgeClass = CATEGORY_BADGE_COLORS[category] || CATEGORY_BADGE_COLORS.Other

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-[#D4CFC7] rounded-lg hover:bg-[#FAFAF8] transition-colors"
              >
                <FileText className="w-4 h-4 text-slate flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate">
                    {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Category badge + dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setCategoryOpen(categoryOpen === doc.id ? null : doc.id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${badgeClass} hover:opacity-80 transition-opacity`}
                  >
                    {category}
                  </button>
                  {categoryOpen === doc.id && (
                    <div className="absolute right-0 top-7 z-10 bg-white border border-[#D4CFC7] rounded-lg shadow-lg py-1 min-w-[140px]">
                      {DOC_CATEGORIES.slice(1).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(doc, cat)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#FAFAF8] transition-colors ${
                            category === cat ? 'text-copper font-medium' : 'text-charcoal'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                    title="Download"
                    className="p-1.5 text-slate hover:text-copper transition-colors disabled:opacity-50"
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    title="Remove"
                    className="p-1.5 text-slate hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-charcoal mb-2">Remove Document</h3>
            <p className="text-sm text-slate mb-4">
              Are you sure you want to permanently remove this document?
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
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
