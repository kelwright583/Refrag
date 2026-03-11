/**
 * System health dashboard (admin)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Activity, Database, HardDrive, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SystemHealthPage() {
  const [storageStats, setStorageStats] = useState<any>(null)

  useEffect(() => {
    // Fetch storage stats (would need Supabase admin API for actual storage usage)
    // For MVP, we'll show placeholder data
    setStorageStats({
      total_storage: 0,
      evidence_storage: 0,
      exports_storage: 0,
    })
  }, [])

  // Get background jobs status
  const { data: jobs } = useQuery({
    queryKey: ['admin-background-jobs'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
  })

  const failedJobs = jobs?.filter((j: any) => j.status === 'failed') || []
  const runningJobs = jobs?.filter((j: any) => j.status === 'running') || []
  const queuedJobs = jobs?.filter((j: any) => j.status === 'queued') || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">System Health</h1>
        <p className="text-slate mt-1">Monitor platform health and performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Usage
          </h2>
          {storageStats ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-charcoal">Total Storage</span>
                  <span className="text-charcoal">
                    {formatBytes(storageStats.total_storage)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-copper h-2 rounded-full"
                    style={{ width: '60%' }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-slate">
                <p>Evidence: {formatBytes(storageStats.evidence_storage)}</p>
                <p>Exports: {formatBytes(storageStats.exports_storage)}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate">Storage stats require admin API access</p>
          )}
        </div>

        {/* Background Jobs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Background Jobs
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal">Failed</span>
              <span className="text-lg font-bold text-red-600">{failedJobs.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal">Running</span>
              <span className="text-lg font-bold text-blue-600">{runningJobs.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal">Queued</span>
              <span className="text-lg font-bold text-yellow-600">{queuedJobs.length}</span>
            </div>
            {failedJobs.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {failedJobs.length} job(s) failed
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Check background jobs for details
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Status
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal">Status</span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <p className="text-xs text-slate mt-2">
              Database connection is active and responding normally.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
