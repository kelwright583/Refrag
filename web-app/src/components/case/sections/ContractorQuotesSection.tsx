'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, CheckCircle } from 'lucide-react'
import { useCaseNotes, useUpsertCaseNote } from '@/hooks/use-case-notes'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface ContractorQuote {
  id: string
  contractorName: string
  contactNumber?: string
  quoteAmount: number
  categories?: Record<string, number>
  notes?: string
  uploadedAt?: string
}

interface ContractorRecommendation {
  selectedId: string
  reason: string
  assessmentNotes: string
}

function formatZar(n: number | null | undefined) {
  if (n == null) return 'R 0.00'
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ContractorQuotesSection({ caseId }: SectionProps) {
  const { data: quoteNotes, isLoading: quotesLoading } = useCaseNotes(caseId, 'contractor_quote_data')
  const { data: recNotes, isLoading: recLoading } = useCaseNotes(caseId, 'contractor_recommendation')
  const upsert = useUpsertCaseNote(caseId)

  const [quotes, setQuotes] = useState<ContractorQuote[]>([])
  const [recommendation, setRecommendation] = useState<ContractorRecommendation>({
    selectedId: '',
    reason: '',
    assessmentNotes: '',
  })
  const [saved, setSaved] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  useEffect(() => {
    if (quoteNotes && quoteNotes.length > 0) {
      // Aggregate all quote note records
      const allQuotes: ContractorQuote[] = []
      for (const note of quoteNotes) {
        const raw = note.content
        if (Array.isArray(raw)) {
          allQuotes.push(...(raw as ContractorQuote[]))
        } else if (raw && typeof raw === 'object') {
          allQuotes.push(raw as ContractorQuote)
        }
      }
      setQuotes(allQuotes)
    }
  }, [quoteNotes])

  useEffect(() => {
    if (recNotes && recNotes.length > 0) {
      const raw = recNotes[0].content
      if (raw && typeof raw === 'object') {
        setRecommendation(raw as ContractorRecommendation)
      }
    }
  }, [recNotes])

  const handleSaveRecommendation = async () => {
    await upsert.mutateAsync({ noteType: 'contractor_recommendation', content: recommendation })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const setRec = (key: keyof ContractorRecommendation, value: string) =>
    setRecommendation((r) => ({ ...r, [key]: value }))

  const isLoading = quotesLoading || recLoading

  // Collect all unique category keys across all quotes
  const allCategories = Array.from(
    new Set(
      quotes.flatMap((q) => Object.keys(q.categories ?? {}))
    )
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading contractor quotes…</span>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-charcoal">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-semibold">Contractor Quotes</span>
        </div>
        <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-10 text-center">
          <FileText className="w-8 h-8 text-slate/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-charcoal">No contractor quotes uploaded</p>
          <p className="text-xs text-slate mt-1">
            Upload quotes via the Contractor Quote section to compare them here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-charcoal">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-semibold">
            Contractor Quotes ({quotes.length})
          </span>
        </div>
        {quotes.length > 1 && (
          <div className="flex border border-[#D4CFC7] rounded-lg overflow-hidden text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-copper text-white' : 'text-slate hover:bg-gray-50'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'table' ? 'bg-copper text-white' : 'text-slate hover:bg-gray-50'
              }`}
            >
              Compare
            </button>
          </div>
        )}
      </div>

      {/* Cards view */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q) => {
            const isSelected = recommendation.selectedId === q.id
            return (
              <div
                key={q.id}
                className={`border rounded-xl p-5 space-y-3 transition-all ${
                  isSelected
                    ? 'border-copper bg-copper/5 shadow-sm'
                    : 'border-[#D4CFC7] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{q.contractorName}</p>
                    {q.contactNumber && (
                      <p className="text-xs text-slate mt-0.5">{q.contactNumber}</p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 bg-copper text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Selected
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-[#D4CFC7]">
                  <p className="text-xs text-slate mb-1">Quote Amount</p>
                  <p className="text-xl font-bold text-charcoal">{formatZar(q.quoteAmount)}</p>
                </div>
                {q.categories && Object.keys(q.categories).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(q.categories).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between text-xs">
                        <span className="text-slate capitalize">{cat}</span>
                        <span className="text-charcoal font-medium">{formatZar(amt)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.notes && (
                  <p className="text-xs text-slate border-t border-[#D4CFC7] pt-2">{q.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Comparison table */}
      {viewMode === 'table' && quotes.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-[#D4CFC7] rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#D4CFC7]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate uppercase tracking-wide">
                  Category
                </th>
                {quotes.map((q) => (
                  <th key={q.id} className="px-4 py-2.5 text-right text-xs font-semibold text-charcoal">
                    {q.contractorName}
                    {recommendation.selectedId === q.id && (
                      <span className="ml-1.5 text-copper">★</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allCategories.map((cat, i) => (
                <tr key={cat} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                  <td className="px-4 py-2 text-slate capitalize">{cat}</td>
                  {quotes.map((q) => (
                    <td key={q.id} className="px-4 py-2 text-right font-medium text-charcoal">
                      {q.categories?.[cat] != null ? formatZar(q.categories[cat]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-[#D4CFC7] bg-copper/5 font-bold">
                <td className="px-4 py-3 text-charcoal">Total</td>
                {quotes.map((q) => (
                  <td key={q.id} className="px-4 py-3 text-right text-copper font-bold">
                    {formatZar(q.quoteAmount)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Recommended Contractor */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-6 space-y-4">
        <h4 className="text-sm font-semibold text-charcoal uppercase tracking-wide">Recommended Contractor</h4>

        <div className="space-y-3">
          {quotes.map((q) => (
            <label key={q.id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="recommended"
                value={q.id}
                checked={recommendation.selectedId === q.id}
                onChange={() => setRec('selectedId', q.id)}
                className="mt-0.5 w-4 h-4 text-copper border-[#D4CFC7] focus:ring-copper"
              />
              <div>
                <p className="text-sm font-medium text-charcoal">{q.contractorName}</p>
                <p className="text-xs text-slate">{formatZar(q.quoteAmount)}</p>
              </div>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">Reason for Recommendation</label>
          <textarea
            value={recommendation.reason}
            onChange={(e) => setRec('reason', e.target.value)}
            rows={2}
            placeholder="Explain why this contractor is recommended…"
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">Assessment Notes</label>
          <textarea
            value={recommendation.assessmentNotes}
            onChange={(e) => setRec('assessmentNotes', e.target.value)}
            rows={3}
            placeholder="General notes on the quotes, scope of work, concerns…"
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#D4CFC7]">
          <span className="text-sm text-slate">
            {saved && <span className="text-emerald-600">✓ Recommendation saved</span>}
          </span>
          <button
            onClick={handleSaveRecommendation}
            disabled={upsert.isPending || !recommendation.selectedId}
            className="px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {upsert.isPending ? 'Saving…' : 'Mark as Recommended'}
          </button>
        </div>
      </div>
    </div>
  )
}
