'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useCreateMandate, useMandates } from '@/hooks/use-mandates'
import { useClients } from '@/hooks/use-clients'
import { VERTICAL_OPTIONS } from '@/lib/types/mandate'

export default function NewMandatePage() {
  const router = useRouter()
  const createMandate = useCreateMandate()
  const { data: mandates } = useMandates()
  const { data: clients } = useClients()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState('')
  const [vertical, setVertical] = useState('all')
  const [cloneFromId, setCloneFromId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const result = await createMandate.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        client_id: clientId || null,
        vertical,
        clone_from_id: cloneFromId || null,
      })
      router.push(`/app/mandates/${result.id}`)
    } catch {
      // handled by mutation state
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/app/mandates')}
        className="flex items-center gap-2 text-sm text-slate hover:text-charcoal mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Mandates
      </button>

      <h1 className="text-3xl font-heading font-bold text-charcoal mb-2">New Mandate</h1>
      <p className="text-slate mb-8">
        Create a requirement template for a client or your entire organisation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Motor Assessment"
            required
            className="w-full px-4 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this mandate template..."
            rows={3}
            className="w-full px-4 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
            >
              <option value="">Org-wide (no specific client)</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate mt-1">Leave empty for an organisation-wide mandate</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Vertical</label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
            >
              {VERTICAL_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Start from existing mandate
          </label>
          <select
            value={cloneFromId}
            onChange={(e) => setCloneFromId(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 text-charcoal"
          >
            <option value="">Start from scratch</option>
            {(mandates || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.requirement_count || 0} requirements)
              </option>
            ))}
          </select>
          <p className="text-xs text-slate mt-1">
            Clone requirements from an existing mandate as a starting point
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-[#D4CFC7]">
          <button
            type="submit"
            disabled={!name.trim() || createMandate.isPending}
            className="flex items-center gap-2 bg-copper text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {createMandate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Mandate
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/mandates')}
            className="px-6 py-2.5 text-sm text-slate hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>

        {createMandate.isError && (
          <p className="text-sm text-red-600">
            {(createMandate.error as Error)?.message || 'Failed to create mandate'}
          </p>
        )}
      </form>
    </div>
  )
}
