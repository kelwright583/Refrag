'use client'

import { useState } from 'react'
import { X, Copy, Loader2 } from 'lucide-react'
import { Mandate } from '@/lib/types/mandate'
import { useMandates, useCloneMandate } from '@/hooks/use-mandates'

interface MandateImportModalProps {
  visible: boolean
  currentMandateId: string
  onClose: () => void
  onImported: (newMandateId: string) => void
}

export function MandateImportModal({
  visible,
  currentMandateId,
  onClose,
  onImported,
}: MandateImportModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: mandates, isLoading } = useMandates()
  const cloneMandate = useCloneMandate()

  if (!visible) return null

  const availableMandates = (mandates || []).filter((m) => m.id !== currentMandateId)

  const selectedMandate = availableMandates.find((m) => m.id === selectedId)

  const handleImport = async () => {
    if (!selectedId) return
    try {
      const result = await cloneMandate.mutateAsync({ id: selectedId })
      onImported(result.id)
    } catch {
      // Error handling is done via mutation state
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4CFC7]">
          <h2 className="text-lg font-heading font-bold text-charcoal">Import from Existing Mandate</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-copper" />
              <p className="text-sm text-slate mt-2">Loading mandates...</p>
            </div>
          ) : availableMandates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate">No other mandates to import from.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableMandates.map((mandate) => (
                <button
                  key={mandate.id}
                  onClick={() => setSelectedId(mandate.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedId === mandate.id
                      ? 'border-copper bg-copper/5'
                      : 'border-[#D4CFC7] hover:border-copper/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{mandate.name}</p>
                      <p className="text-xs text-slate mt-0.5">
                        {mandate.client_name || 'Org-wide'} · {mandate.vertical || 'All'}
                      </p>
                    </div>
                    <span className="text-xs text-slate bg-gray-100 px-2 py-0.5 rounded-full">
                      {mandate.requirement_count || 0} req
                    </span>
                  </div>
                  {mandate.description && (
                    <p className="text-xs text-slate mt-1 line-clamp-2">{mandate.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedMandate && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-[#D4CFC7]">
              <p className="text-xs font-medium text-slate mb-1">Selected mandate</p>
              <p className="text-sm font-medium text-charcoal">{selectedMandate.name}</p>
              <p className="text-xs text-slate mt-0.5">
                {selectedMandate.requirement_count || 0} requirements will be cloned into a new mandate
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#D4CFC7]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedId || cloneMandate.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cloneMandate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Import & Clone
          </button>
        </div>
      </div>
    </div>
  )
}
