/**
 * Inbound emails — review and create cases from forwarded emails
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface InboundRow {
  id: string
  raw_subject: string | null
  raw_from: string | null
  status: string
  case_id: string | null
  created_at: string
  parsed_json: Record<string, unknown> | null
}

export default function InboundPage() {
  const [list, setList] = useState<InboundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InboundRow | null>(null)
  const [actioning, setActioning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inbound?limit=50')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setList(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createCase = async (id: string) => {
    setActioning(true)
    try {
      const res = await fetch(`/api/inbound/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_case' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSelected(null)
      await load()
      if (data.case_id) window.location.href = `/app/cases/${data.case_id}`
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActioning(false)
    }
  }

  const reject = async (id: string) => {
    setActioning(true)
    try {
      const res = await fetch(`/api/inbound/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSelected(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setActioning(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Inbound</h1>
        <p className="text-slate mt-1">
          Forward appointment emails to your ingestion address; review and create cases here.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D4CFC7] rounded-lg">
          <p className="text-slate font-medium">No inbound emails yet</p>
          <p className="text-sm text-muted mt-1">Configure your email provider to POST to /api/inbound/email when you receive forwards.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between py-4 px-4 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC]"
            >
              <button
                type="button"
                onClick={() => setSelected(selected?.id === row.id ? null : row)}
                className="text-left min-w-0 flex-1"
              >
                <p className="font-medium text-slate truncate">{row.raw_subject || '(No subject)'}</p>
                <p className="text-sm text-muted truncate">{row.raw_from || ''}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(row.created_at).toLocaleString('en-ZA')} · {row.status}
                  {row.case_id && (
                    <>
                      {' · '}
                      <Link href={`/app/cases/${row.case_id}`} className="text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
                        View case
                      </Link>
                    </>
                  )}
                </p>
              </button>
              {row.status === 'pending' && (
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => createCase(row.id)}
                    disabled={actioning}
                    className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95 disabled:opacity-60"
                  >
                    Create case
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(row.id)}
                    disabled={actioning}
                    className="px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-muted hover:text-slate"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#D4CFC7] flex justify-between items-center">
              <h2 className="text-lg font-heading font-bold text-charcoal">Email Details</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-slate hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p><span className="text-muted">From:</span> {selected.raw_from}</p>
              <p className="mt-2"><span className="text-muted">Subject:</span> {selected.raw_subject}</p>
              {selected.parsed_json && Object.keys(selected.parsed_json).length > 0 && (
                <div className="mt-4 p-3 bg-[#F5F2EE] rounded-lg">
                  <p className="text-sm font-medium text-slate mb-2">Parsed</p>
                  <pre className="text-xs text-muted whitespace-pre-wrap">{JSON.stringify(selected.parsed_json, null, 2)}</pre>
                </div>
              )}
            </div>
            {selected.status === 'pending' && (
              <div className="p-6 border-t border-[#D4CFC7] flex gap-2">
                <button type="button" onClick={() => createCase(selected.id)} disabled={actioning} className="px-4 py-2 bg-accent text-white rounded-lg font-medium">Create case</button>
                <button type="button" onClick={() => reject(selected.id)} disabled={actioning} className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-slate">Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
