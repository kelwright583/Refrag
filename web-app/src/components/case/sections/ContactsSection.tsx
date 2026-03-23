'use client'

import { Contact, AlertCircle, RefreshCw, Phone, Mail } from 'lucide-react'
import { useCaseContacts } from '@/hooks/use-contacts'
import type { ContactType } from '@/lib/types/contact'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  insured: 'Insured',
  broker: 'Broker',
  insurer: 'Insurer',
  panelbeater: 'Panelbeater',
  other: 'Other',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg border border-[#D4CFC7] bg-[#FAFAF8]" />
      ))}
    </div>
  )
}

export function ContactsSection({ caseId }: SectionProps) {
  const { data: contacts, isLoading, isError, refetch } = useCaseContacts(caseId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Contact className="w-4 h-4" />
          <span className="text-sm">Case contacts</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Contact className="w-4 h-4" />
          <span className="text-sm">Case contacts</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load contacts.</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate">
        <Contact className="w-4 h-4" />
        <span className="text-sm">Case contacts</span>
      </div>

      {!contacts || contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center">
          <Contact className="w-7 h-7 text-[#D4CFC7] mx-auto mb-2" />
          <p className="text-sm text-slate">No contacts added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between p-3 border border-[#D4CFC7] rounded-lg bg-[#FAFAF8]"
            >
              <div>
                <p className="font-medium text-charcoal text-sm">{contact.name}</p>
                <span className="text-xs text-muted">{CONTACT_TYPE_LABELS[contact.type]}</span>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
                  >
                    <Mail className="w-3 h-3" />
                    {contact.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
