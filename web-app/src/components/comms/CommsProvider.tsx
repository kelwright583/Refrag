'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { checkCommsTrigger, CommsTriggerResult } from '@/lib/comms/trigger'
import { CommsTriggerPrompt } from './CommsTriggerPrompt'
import { EmailPreviewPanel } from './EmailPreviewPanel'
import { createClient } from '@/lib/supabase/client'

interface CommsContextType {
  triggerComms: (event: string, caseId: string) => Promise<void>
  dismissTrigger: () => void
  currentTrigger: CommsTriggerResult | null
  isPreviewOpen: boolean
  openPreview: () => void
  closePreview: () => void
}

const CommsContext = createContext<CommsContextType | null>(null)

export function useComms(): CommsContextType {
  const ctx = useContext(CommsContext)
  if (!ctx) {
    throw new Error('useComms must be used within a CommsProvider')
  }
  return ctx
}

interface CommsProviderProps {
  children: ReactNode
}

export function CommsProvider({ children }: CommsProviderProps) {
  const [currentTrigger, setCurrentTrigger] = useState<CommsTriggerResult | null>(null)
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const triggerComms = useCallback(async (event: string, caseId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMember } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!orgMember) return

      const result = await checkCommsTrigger(event, caseId, orgMember.org_id)

      if (result.shouldPrompt) {
        setCurrentTrigger(result)
        setActiveCaseId(caseId)
      }
    } catch (err) {
      console.error('Comms trigger error:', err)
    }
  }, [])

  const dismissTrigger = useCallback(() => {
    if (currentTrigger && activeCaseId) {
      logDismissal(currentTrigger.triggerEvent, activeCaseId)
    }
    setCurrentTrigger(null)
    setActiveCaseId(null)
    setIsPreviewOpen(false)
  }, [currentTrigger, activeCaseId])

  const openPreview = useCallback(() => {
    setIsPreviewOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  const handleReviewAndSend = useCallback(() => {
    setIsPreviewOpen(true)
  }, [])

  const handleSent = useCallback(() => {
    setCurrentTrigger(null)
    setActiveCaseId(null)
    setIsPreviewOpen(false)
  }, [])

  return (
    <CommsContext.Provider
      value={{
        triggerComms,
        dismissTrigger,
        currentTrigger,
        isPreviewOpen,
        openPreview,
        closePreview,
      }}
    >
      {children}

      {currentTrigger && !isPreviewOpen && (
        <CommsTriggerPrompt
          trigger={currentTrigger}
          onReviewAndSend={handleReviewAndSend}
          onDismiss={dismissTrigger}
        />
      )}

      {currentTrigger && isPreviewOpen && activeCaseId && (
        <EmailPreviewPanel
          trigger={currentTrigger}
          caseId={activeCaseId}
          onClose={closePreview}
          onSent={handleSent}
        />
      )}
    </CommsContext.Provider>
  )
}

async function logDismissal(triggerEvent: string, caseId: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: orgMember } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!orgMember) return

    await supabase.from('comms_log').insert({
      org_id: orgMember.org_id,
      case_id: caseId,
      sent_by: user.id,
      channel: 'email',
      direction: 'outbound',
      to_recipients: '',
      subject: `[Dismissed] ${triggerEvent}`,
      body_md: '',
      trigger_event: triggerEvent,
      status: 'dismissed',
    })
  } catch {
    // Best-effort logging
  }
}
