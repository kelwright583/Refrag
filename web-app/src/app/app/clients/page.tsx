/**
 * Clients list - clean, minimal, white background
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useClients, useCreateClient, useDeleteClient } from '@/hooks/use-clients'
import { Client } from '@/lib/types/client'

function ClientIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#30313A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const createClient = useCreateClient()
  const deleteClient = useDeleteClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    try {
      await createClient.mutateAsync({ name: formName.trim(), contact_email: formEmail.trim() || undefined })
      setFormName('')
      setFormEmail('')
      setShowForm(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (c: Client) => {
    if (!confirm(`Remove ${c.name}?`)) return
    try {
      await deleteClient.mutateAsync(c.id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Clients</h1>
        <p className="text-slate mt-1">
          Insurers, fintechs, fleet managers — anyone you do work for
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {clients && clients.length > 0 ? (
            clients.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-4 px-4 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
              >
                <Link href={`/app/clients/${c.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-slate truncate">{c.name}</p>
                  {c.contact_email && (
                    <p className="text-sm text-muted truncate mt-0.5">{c.contact_email}</p>
                  )}
                </Link>
                <button
                  onClick={() => handleDelete(c)}
                  className="ml-4 text-sm text-muted hover:text-slate transition-colors"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="py-16 text-center border border-dashed border-[#D4CFC7] rounded-lg">
              <span className="inline-flex justify-center">
                <ClientIcon size={40} />
              </span>
              <p className="text-slate mt-4 font-medium">No clients yet</p>
              <p className="text-sm text-muted mt-1">Add your first client to get started</p>
            </div>
          )}

          {showForm ? (
            <form onSubmit={handleAdd} className="mt-4 p-4 border border-[#D4CFC7] rounded-lg bg-[#FAFBFC]">
              <input
                type="text"
                placeholder="Client name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent mb-3"
                autoFocus
              />
              <input
                type="email"
                placeholder="Contact email (optional)"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-slate placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createClient.isPending || !formName.trim()}
                  className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
                >
                  {createClient.isPending ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormName(''); setFormEmail(''); }}
                  className="px-4 py-2 text-muted hover:text-slate"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full py-3 border border-dashed border-[#C9C4BC] rounded-lg text-muted hover:text-slate hover:border-slate/30 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              Add client
            </button>
          )}
        </div>
      )}
    </div>
  )
}
