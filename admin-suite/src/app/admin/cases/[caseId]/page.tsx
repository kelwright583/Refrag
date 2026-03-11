/**
 * Case detail page (admin - read-only)
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCase, useCaseEvidence, useEvidenceSignedUrl, useCaseRiskItems } from '@/hooks/use-cases'
import { ArrowLeft, FileText, Image, Video, File, Eye, Shield, Car, Building2, Package, X } from 'lucide-react'
import { useState } from 'react'
import { RISK_TYPE_LABELS, COVER_TYPE_LABELS, RiskType, CoverType } from '@/lib/types/risk-item'

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string
  const [viewingEvidenceId, setViewingEvidenceId] = useState<string | null>(null)

  const { data: caseData, isLoading } = useCase(caseId)
  const { data: evidence, isLoading: evidenceLoading } = useCaseEvidence(caseId)
  const { data: riskItems, isLoading: riskItemsLoading } = useCaseRiskItems(caseId)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading case...</p>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-charcoal">Case not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/cases')}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Case Search
        </button>
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">
            {caseData.case_number}
          </h1>
          <p className="text-slate mt-1">Read-only case view</p>
        </div>
      </div>

      {/* Case Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Case Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Client Name</label>
            <p className="text-charcoal">{caseData.client_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
            <p className="text-charcoal capitalize">{caseData.status}</p>
          </div>
          {caseData.insurer_name && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Insurer</label>
              <p className="text-charcoal">{caseData.insurer_name}</p>
            </div>
          )}
          {caseData.broker_name && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Broker</label>
              <p className="text-charcoal">{caseData.broker_name}</p>
            </div>
          )}
          {caseData.claim_reference && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Claim Reference
              </label>
              <p className="text-charcoal">{caseData.claim_reference}</p>
            </div>
          )}
          {caseData.loss_date && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Loss Date</label>
              <p className="text-charcoal">{new Date(caseData.loss_date).toLocaleDateString()}</p>
            </div>
          )}
          {caseData.location && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Location</label>
              <p className="text-charcoal">{caseData.location}</p>
            </div>
          )}
          {caseData.org && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Organisation</label>
              <p className="text-charcoal">{caseData.org.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Risk Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Risk Items</h2>
        {riskItemsLoading ? (
          <p className="text-slate">Loading risk items...</p>
        ) : riskItems && riskItems.length > 0 ? (
          <div className="space-y-3">
            {riskItems.map((item: any) => {
              const riskLabel = RISK_TYPE_LABELS[item.risk_type as RiskType] || item.risk_type
              const coverLabel = item.cover_type ? (COVER_TYPE_LABELS[item.cover_type as CoverType] || item.cover_type) : null

              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {item.risk_type === 'motor_vehicle' && <Car className="w-5 h-5 text-copper" />}
                    {item.risk_type === 'building' && <Building2 className="w-5 h-5 text-copper" />}
                    {!['motor_vehicle', 'building'].includes(item.risk_type) && <Package className="w-5 h-5 text-copper" />}
                    <span className="font-medium text-charcoal">{riskLabel}</span>
                    {item.is_primary && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-copper/10 text-copper rounded-full font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Primary
                      </span>
                    )}
                    {coverLabel && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{coverLabel}</span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-slate mb-2">{item.description}</p>}
                  {item.asset_data && Object.keys(item.asset_data).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(item.asset_data).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-slate capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-charcoal font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate">No risk items</p>
        )}
      </div>

      {/* Write-off Status */}
      {caseData.write_off_status && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Write-off Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
              <p className="text-charcoal capitalize">{caseData.write_off_status.replace(/_/g, ' ')}</p>
            </div>
            {caseData.repair_estimate_amount !== null && caseData.repair_estimate_amount !== undefined && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Repair Estimate</label>
                <p className="text-charcoal">R {Number(caseData.repair_estimate_amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Evidence</h2>
        {evidenceLoading ? (
          <p className="text-slate">Loading evidence...</p>
        ) : evidence && evidence.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidence.map((item: any) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                caseId={caseId}
                onView={() => setViewingEvidenceId(item.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-slate">No evidence</p>
        )}
      </div>

      {/* Evidence Viewer Modal */}
      {viewingEvidenceId && (
        <EvidenceViewerModal
          evidenceId={viewingEvidenceId}
          caseId={caseId}
          onClose={() => setViewingEvidenceId(null)}
        />
      )}
    </div>
  )
}

/**
 * Evidence Card Component
 */
function EvidenceCard({
  evidence,
  caseId,
  onView,
}: {
  evidence: any
  caseId: string
  onView: () => void
}) {
  const getIcon = () => {
    switch (evidence.media_type) {
      case 'photo':
        return <Image className="w-8 h-8 text-slate" />
      case 'video':
        return <Video className="w-8 h-8 text-slate" />
      case 'document':
        return <File className="w-8 h-8 text-slate" />
      default:
        return <FileText className="w-8 h-8 text-slate" />
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-copper transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <div>
            <p className="font-medium text-charcoal text-sm">{evidence.file_name}</p>
            <p className="text-xs text-slate capitalize">{evidence.media_type}</p>
          </div>
        </div>
        <button
          onClick={onView}
          className="p-1 text-slate hover:text-charcoal transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
      {evidence.tags && evidence.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {evidence.tags.map((tag: any, idx: number) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
            >
              {tag.tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Evidence Viewer Modal
 */
function EvidenceViewerModal({
  evidenceId,
  caseId,
  onClose,
}: {
  evidenceId: string
  caseId: string
  onClose: () => void
}) {
  const { data: signedUrl } = useEvidenceSignedUrl(evidenceId, caseId, true)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Evidence Viewer</h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {signedUrl ? (
            <div>
              <img src={signedUrl} alt="Evidence" className="max-w-full h-auto rounded-lg" />
            </div>
          ) : (
            <p className="text-slate">Loading...</p>
          )}
        </div>
      </div>
    </div>
  )
}
