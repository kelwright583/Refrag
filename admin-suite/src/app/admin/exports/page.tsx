/**
 * Exports management page (admin)
 */

'use client'

import { useState } from 'react'
import { useExports, useExportDownloadUrl } from '@/hooks/use-exports'
import { Download, FileText, Building2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatting'

export default function ExportsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const { data: exports, isLoading } = useExports(selectedOrgId || undefined)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Exports</h1>
        <p className="text-slate mt-1">Manage all exports</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading exports...</p>
        </div>
      ) : exports && exports.length > 0 ? (
        <div className="space-y-4">
          {exports.map((exportItem) => (
            <ExportCard key={exportItem.id} exportItem={exportItem} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">No exports found</p>
        </div>
      )}
    </div>
  )
}

/**
 * Export Card Component
 */
function ExportCard({ exportItem }: { exportItem: any }) {
  const [downloading, setDownloading] = useState(false)
  const { data: downloadUrl } = useExportDownloadUrl(
    exportItem.id,
    !!exportItem.storage_path
  )

  const handleDownload = () => {
    if (downloadUrl) {
      setDownloading(true)
      window.open(downloadUrl, '_blank')
      setTimeout(() => setDownloading(false), 1000)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-heading font-bold text-charcoal">
              Assessor Pack Export
            </h2>
            {exportItem.org && (
              <div className="flex items-center gap-1 text-sm text-slate">
                <Building2 className="w-4 h-4" />
                <span>{exportItem.org.name}</span>
              </div>
            )}
          </div>
          {exportItem.case && (
            <p className="text-sm text-charcoal mb-1">
              Case: {exportItem.case.case_number} - {exportItem.case.client_name}
            </p>
          )}
          {exportItem.report && (
            <p className="text-sm text-slate">
              Report: {exportItem.report.title} (Version {exportItem.report.version})
            </p>
          )}
          <p className="text-xs text-slate mt-2">
            Created: {formatDateTime(exportItem.created_at)}
          </p>
        </div>
        {exportItem.storage_path && (
          <button
            onClick={handleDownload}
            disabled={!downloadUrl || downloading}
            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>
    </div>
  )
}
