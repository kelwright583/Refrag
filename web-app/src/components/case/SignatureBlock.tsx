'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { PenLine, X, Loader2, Trash2 } from 'lucide-react'
import { SignaturePad } from '@/components/SignaturePad'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

export interface SignatureBlockProps {
  caseId: string
  reportId?: string
  label: string // e.g. "assessor" | "insured" — used as the storage slug
  signerName?: string
  signerDesignation?: string
  onSigned?: (dataUrl: string) => void
}

interface SignatureState {
  dataUrl: string | null
  storagePath: string | null
  signedAt: string | null
  signerName: string
  signerDesignation: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function SignatureBlock({
  caseId,
  reportId,
  label,
  signerName = '',
  signerDesignation = '',
  onSigned,
}: SignatureBlockProps) {
  const { addToast } = useToast()
  const supabase = createClient()

  const [state, setState] = useState<SignatureState>({
    dataUrl: null,
    storagePath: null,
    signedAt: null,
    signerName,
    signerDesignation,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Modal form state
  const [formName, setFormName] = useState(signerName)
  const [formDesignation, setFormDesignation] = useState(signerDesignation)
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null)

  // Load existing signature from storage if path is stored in case_notes meta
  useEffect(() => {
    async function loadExisting() {
      if (!caseId) return
      try {
        const { data: notes } = await supabase
          .from('case_notes')
          .select('content, meta')
          .eq('case_id', caseId)
          .eq('note_type', 'signature_data')
          .limit(1)
          .single()

        if (notes?.meta) {
          const meta = notes.meta as Record<string, any>
          const entry = meta[label]
          if (entry?.storage_path) {
            // Generate a signed URL (1 hour is enough for display)
            const { data: signed } = await supabase.storage
              .from('signatures')
              .createSignedUrl(entry.storage_path, 3600)

            if (signed?.signedUrl) {
              setState({
                dataUrl: signed.signedUrl,
                storagePath: entry.storage_path,
                signedAt: entry.signed_at || null,
                signerName: entry.signer_name || signerName,
                signerDesignation: entry.signer_designation || signerDesignation,
              })
            }
          }
        }
      } catch {
        // No existing signature — ignore
      }
    }
    loadExisting()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, label])

  const handleSaveSignature = useCallback(
    async (dataUrl: string) => {
      if (!formName.trim()) {
        addToast('Please enter the signer name', 'warning')
        return
      }
      setIsSaving(true)
      try {
        // Convert base64 data URL to Blob
        const base64 = dataUrl.split(',')[1]
        const byteString = atob(base64)
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: 'image/png' })

        // Get org_id for the storage path
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: orgMember } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        const orgId = orgMember?.org_id || 'unknown'
        const slugLabel = label.replace(/\s+/g, '_').toLowerCase()
        const storagePath = `${orgId}/signatures/${caseId}_${slugLabel}.png`

        // Upload to Supabase Storage bucket "signatures"
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(storagePath, blob, {
            contentType: 'image/png',
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Persist path in case_notes with note_type = 'signature_data'
        const signedAt = new Date().toISOString()
        const { data: existingNote } = await supabase
          .from('case_notes')
          .select('id, meta')
          .eq('case_id', caseId)
          .eq('note_type', 'signature_data')
          .limit(1)
          .single()

        const existingMeta = (existingNote?.meta as Record<string, any>) || {}
        const updatedMeta = {
          ...existingMeta,
          [label]: {
            storage_path: storagePath,
            signed_at: signedAt,
            signer_name: formName,
            signer_designation: formDesignation,
          },
        }

        if (existingNote?.id) {
          await supabase
            .from('case_notes')
            .update({ meta: updatedMeta })
            .eq('id', existingNote.id)
        } else {
          await supabase.from('case_notes').insert({
            case_id: caseId,
            org_id: orgId,
            author_user_id: user.id,
            note_type: 'signature_data',
            content: '',
            meta: updatedMeta,
          })
        }

        // Generate signed URL for display
        const { data: signed } = await supabase.storage
          .from('signatures')
          .createSignedUrl(storagePath, 3600)

        setState({
          dataUrl: signed?.signedUrl || dataUrl,
          storagePath,
          signedAt,
          signerName: formName,
          signerDesignation: formDesignation,
        })

        if (onSigned) onSigned(dataUrl)
        setModalOpen(false)
        addToast('Signature saved', 'success')
      } catch (err: any) {
        addToast(err.message || 'Failed to save signature', 'error')
      } finally {
        setIsSaving(false)
      }
    },
    [caseId, label, formName, formDesignation, supabase, addToast, onSigned]
  )

  function handleClearSignature() {
    setState({
      dataUrl: null,
      storagePath: null,
      signedAt: null,
      signerName,
      signerDesignation,
    })
    setFormName(signerName)
    setFormDesignation(signerDesignation)
    setPendingDataUrl(null)
  }

  function openModal() {
    setFormName(state.signerName || signerName)
    setFormDesignation(state.signerDesignation || signerDesignation)
    setPendingDataUrl(null)
    setModalOpen(true)
  }

  // For "insured" variant on mobile — use full-screen overlay
  const isInsured = label === 'insured'

  return (
    <>
      {/* Display area */}
      <div className="rounded-lg border border-[#D4CFC7] p-4 bg-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50 mb-3">
          {label === 'assessor'
            ? 'Assessor Signature'
            : label === 'insured'
            ? 'Insured Signature'
            : label}
        </p>

        {state.dataUrl ? (
          <div className="flex flex-col gap-2">
            {/* Signature image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.dataUrl}
              alt={`${label} signature`}
              className="max-h-24 object-contain border-b border-[#D4CFC7] pb-2"
            />
            {/* Meta */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{state.signerName}</p>
                {state.signerDesignation && (
                  <p className="text-xs text-charcoal/60">{state.signerDesignation}</p>
                )}
                {state.signedAt && (
                  <p className="text-xs text-charcoal/40 mt-0.5">{formatDate(state.signedAt)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearSignature}
                className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        ) : (
          /* Empty state */
          <button
            type="button"
            onClick={openModal}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#D4CFC7] py-8 text-charcoal/40 hover:border-[#C9663D] hover:text-[#C9663D] transition-colors group"
          >
            <PenLine className="w-6 h-6" />
            <span className="text-sm font-medium">Sign here</span>
          </button>
        )}

        {!state.dataUrl && (
          <button
            type="button"
            onClick={openModal}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#1c1917] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#292524] transition-colors"
          >
            <PenLine className="w-3 h-3" />
            Sign
          </button>
        )}
      </div>

      {/* Signature Modal */}
      {modalOpen && (
        <div
          className={
            isInsured
              ? 'fixed inset-0 z-50 bg-white flex flex-col'
              : 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4'
          }
          role="dialog"
          aria-modal="true"
          aria-label="Capture signature"
        >
          <div
            className={
              isInsured
                ? 'flex flex-col flex-1 overflow-auto'
                : 'w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#D4CFC7] flex flex-col'
            }
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4CFC7]">
              <div className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-[#C9663D]" />
                <h3 className="text-base font-semibold text-charcoal">Capture Signature</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-charcoal/40 hover:text-charcoal transition-colors rounded-md p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col gap-5 px-6 py-5 flex-1 overflow-auto">
              {/* Signature pad */}
              <SignaturePad
                width={isInsured ? Math.min((typeof window !== 'undefined' ? window.innerWidth : 528) - 48, 600) : 480}
                height={180}
                onSave={(url) => setPendingDataUrl(url)}
                onClear={() => setPendingDataUrl(null)}
              />

              {/* Printed name */}
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="sig-name">
                  Printed Name
                </label>
                <input
                  id="sig-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D]"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="sig-designation">
                  Designation <span className="text-charcoal/40">(optional)</span>
                </label>
                <input
                  id="sig-designation"
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="e.g. Motor Vehicle Assessor"
                  className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D]"
                />
              </div>

              {/* Date (auto) */}
              <div>
                <label className="block text-xs font-medium text-charcoal/70 mb-1">
                  Date
                </label>
                <p className="text-sm text-charcoal/80 border border-[#D4CFC7] rounded-lg px-3 py-2 bg-[#f9f7f4]">
                  {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#D4CFC7]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-[#D4CFC7] bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-[#f9f7f4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingDataUrl || isSaving || !formName.trim()}
                onClick={() => pendingDataUrl && handleSaveSignature(pendingDataUrl)}
                className="flex items-center gap-1.5 rounded-lg bg-[#C9663D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b85a33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PenLine className="w-4 h-4" />
                )}
                {isSaving ? 'Saving…' : 'Confirm Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
