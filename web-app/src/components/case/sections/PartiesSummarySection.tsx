'use client'

import React, { useState } from 'react'
import { Users, AlertCircle, RefreshCw, Plus, Pencil, X, Check, Trash2, Phone, Mail } from 'lucide-react'
import { useCaseContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts'
import { Field, Input, Select } from '@/components/assessment/shared'
import type { CaseContact, ContactType, CreateContactInput, UpdateContactInput } from '@/lib/types/contact'

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

const TYPE_BADGE_COLOURS: Record<ContactType, string> = {
  insured: 'bg-blue-100 text-blue-700',
  broker: 'bg-purple-100 text-purple-700',
  insurer: 'bg-green-100 text-green-700',
  panelbeater: 'bg-orange-100 text-orange-700',
  other: 'bg-slate-100 text-slate-600',
}

interface ContactFormState {
  name: string
  type: ContactType
  phone: string
  email: string
  role: string
}

const emptyForm: ContactFormState = {
  name: '',
  type: 'insured',
  phone: '',
  email: '',
  role: '',
}

function contactToForm(c: CaseContact): ContactFormState {
  return {
    name: c.name,
    type: c.type,
    phone: c.phone ?? '',
    email: c.email ?? '',
    role: (c as CaseContact & { role?: string }).role ?? '',
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg border border-[#D4CFC7] bg-[#FAFAF8]" />
      ))}
    </div>
  )
}

function ContactFormFields({
  form,
  onChange,
}: {
  form: ContactFormState
  onChange: (f: ContactFormState) => void
}) {
  function set(key: keyof ContactFormState, value: string) {
    onChange({ ...form, [key]: value })
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name" required>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
      </Field>
      <Field label="Type">
        <Select value={form.type} onChange={(e) => set('type', e.target.value as ContactType)}>
          {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((t) => (
            <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
          ))}
        </Select>
      </Field>
      <Field label="Phone">
        <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. 082 000 0000" />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="e.g. name@example.com" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Role Description">
          <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Registered owner, claimant" />
        </Field>
      </div>
    </div>
  )
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: CaseContact
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-charcoal text-sm">{contact.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE_COLOURS[contact.type]}`}>
              {CONTACT_TYPE_LABELS[contact.type]}
            </span>
          </div>
          {(contact as CaseContact & { role?: string }).role && (
            <p className="text-xs text-muted mt-0.5">{(contact as CaseContact & { role?: string }).role}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
                <Phone className="w-3 h-3" />{contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
                <Mail className="w-3 h-3" />{contact.email}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} aria-label="Edit contact" className="p-1 text-slate hover:text-copper transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button onClick={onDelete} aria-label="Remove contact" className="p-1 text-slate hover:text-red-500 transition-colors" title="Remove">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartiesSummarySection({ caseId }: SectionProps) {
  const { data: contacts, isLoading, isError, refetch } = useCaseContacts(caseId)
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<ContactFormState>(emptyForm)
  const [editForm, setEditForm] = useState<ContactFormState>(emptyForm)

  async function handleAdd() {
    if (!addForm.name.trim()) return
    const input: CreateContactInput = {
      case_id: caseId,
      type: addForm.type,
      name: addForm.name.trim(),
      phone: addForm.phone || undefined,
      email: addForm.email || undefined,
    }
    await createContact.mutateAsync(input)
    setAdding(false)
    setAddForm(emptyForm)
  }

  function startEdit(contact: CaseContact) {
    setEditingId(contact.id)
    setEditForm(contactToForm(contact))
  }

  async function handleUpdate() {
    if (!editingId || !editForm.name.trim()) return
    const updates: UpdateContactInput = {
      type: editForm.type,
      name: editForm.name.trim(),
      phone: editForm.phone || undefined,
      email: editForm.email || undefined,
    }
    await updateContact.mutateAsync({ contactId: editingId, caseId, updates })
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function handleDelete(contactId: string) {
    if (!confirm('Remove this party from the case?')) return
    await deleteContact.mutateAsync({ contactId, caseId })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Users className="w-4 h-4" />
          <span className="text-sm">Involved parties</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <Users className="w-4 h-4" />
          <span className="text-sm">Involved parties</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load parties.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate">
          <Users className="w-4 h-4" />
          <span className="text-sm">Involved parties</span>
        </div>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setAddForm(emptyForm) }}
            className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
          >
            <Plus className="w-3 h-3" /> Add Party
          </button>
        )}
      </div>

      {contacts && contacts.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <Users className="w-8 h-8 text-[#D4CFC7] mx-auto" />
          <p className="text-sm text-slate">No parties added yet.</p>
          <button
            onClick={() => { setAdding(true); setAddForm(emptyForm) }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Party
          </button>
        </div>
      )}

      <div className="space-y-2">
        {contacts?.map((contact) =>
          editingId === contact.id ? (
            <div key={contact.id} className="rounded-lg border border-copper/30 bg-[#FAFAF8] p-3 space-y-3">
              <ContactFormFields form={editForm} onChange={setEditForm} />
              <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
                <button
                  onClick={handleUpdate}
                  disabled={updateContact.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Check className="w-3.5 h-3.5" />
                  {updateContact.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditForm(emptyForm) }}
                  disabled={updateContact.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                {updateContact.isError && <span className="text-xs text-red-600 ml-2">Save failed.</span>}
              </div>
            </div>
          ) : (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => startEdit(contact)}
              onDelete={() => handleDelete(contact.id)}
            />
          )
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-copper/30 bg-[#FAFAF8] p-3 space-y-3">
          <p className="text-xs font-semibold text-charcoal uppercase tracking-wide">New Party</p>
          <ContactFormFields form={addForm} onChange={setAddForm} />
          <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
            <button
              onClick={handleAdd}
              disabled={createContact.isPending || !addForm.name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Check className="w-3.5 h-3.5" />
              {createContact.isPending ? 'Adding…' : 'Add Party'}
            </button>
            <button
              onClick={() => { setAdding(false); setAddForm(emptyForm) }}
              disabled={createContact.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            {createContact.isError && <span className="text-xs text-red-600 ml-2">Failed to add party.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
