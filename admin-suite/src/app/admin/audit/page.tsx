/**
 * Audit log viewer (admin)
 */

'use client'

import { useState } from 'react'
import { useAuditLogs } from '@/hooks/use-audit'
import { FileText, Shield, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatting'

export default function AuditPage() {
  const [logType, setLogType] = useState<'admin' | 'data_access'>('admin')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: logs, isLoading } = useAuditLogs(logType, 200)

  const filteredLogs = logs?.filter((log: any) => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.resource?.toLowerCase().includes(searchLower) ||
      log.reason?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Audit Logs</h1>
        <p className="text-slate mt-1">View admin actions and data access logs</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogType('admin')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                logType === 'admin'
                  ? 'bg-copper text-white'
                  : 'bg-gray-100 text-charcoal hover:bg-gray-200'
              }`}
            >
              Admin Actions
            </button>
            <button
              onClick={() => setLogType('data_access')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                logType === 'data_access'
                  ? 'bg-copper text-white'
                  : 'bg-gray-100 text-charcoal hover:bg-gray-200'
              }`}
            >
              Data Access
            </button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>
        </div>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading logs...</p>
        </div>
      ) : filteredLogs && filteredLogs.length > 0 ? (
        <div className="space-y-2">
          {filteredLogs.map((log: any) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-copper transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {logType === 'admin' ? (
                      <Shield className="w-4 h-4 text-slate" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate" />
                    )}
                    <span className="font-medium text-charcoal">
                      {log.action || log.resource}
                    </span>
                    {log.target_type && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        {log.target_type}
                      </span>
                    )}
                  </div>
                  {log.reason && (
                    <p className="text-sm text-slate mb-1">Reason: {log.reason}</p>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-slate">
                      Details: {JSON.stringify(log.details)}
                    </p>
                  )}
                  {log.org && (
                    <p className="text-xs text-slate mt-1">Org: {log.org.name}</p>
                  )}
                </div>
                <div className="text-right text-xs text-slate">
                  <p>{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">No logs found</p>
        </div>
      )}
    </div>
  )
}
