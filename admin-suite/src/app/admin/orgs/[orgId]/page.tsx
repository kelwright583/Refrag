/**
 * Organisation detail page (admin)
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useOrganisation,
  useUpdateOrganisation,
  useOrgMembers,
  useOrgActivity,
} from '@/hooks/use-orgs'
import { OrgStatus, BillingStatus, SPECIALISATION_LABELS, OrgSpecialisation } from '@/lib/types/admin'
import {
  ArrowLeft,
  Save,
  Building2,
  Users,
  FileText,
  Activity,
  Edit2,
} from 'lucide-react'

const STATUS_OPTIONS: OrgStatus[] = ['active', 'trial', 'suspended', 'closed']
const BILLING_STATUS_OPTIONS: BillingStatus[] = ['trialing', 'active', 'past_due', 'canceled']

export default function OrganisationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string
  const [isEditing, setIsEditing] = useState(false)

  const { data: org, isLoading } = useOrganisation(orgId)
  const { data: members } = useOrgMembers(orgId)
  const { data: activity } = useOrgActivity(orgId)
  const updateOrg = useUpdateOrganisation()

  const [formData, setFormData] = useState({
    status: 'active' as OrgStatus,
    plan_name: '',
    billing_status: 'trialing' as BillingStatus,
    billing_provider: '',
    billing_customer_id: '',
  })

  // Initialize form data when org loads
  useEffect(() => {
    if (org && !isEditing) {
      setFormData({
        status: org.status,
        plan_name: org.plan_name || '',
        billing_status: org.billing_status,
        billing_provider: org.billing_provider || '',
        billing_customer_id: org.billing_customer_id || '',
      })
    }
  }, [org, isEditing])

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync({
        orgId,
        updates: {
          status: formData.status,
          plan_name: formData.plan_name || undefined,
          billing_status: formData.billing_status,
          billing_provider: formData.billing_provider || undefined,
          billing_customer_id: formData.billing_customer_id || undefined,
        },
      })
      setIsEditing(false)
    } catch (error: any) {
      alert(error.message || 'Failed to update organisation')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading organisation...</p>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-charcoal">Organisation not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/orgs')}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Organisations
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-charcoal">{org.name}</h1>
            <p className="text-slate mt-1">Organisation Details</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateOrg.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organisation Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organisation Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Name</label>
                <p className="text-charcoal">{org.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Slug</label>
                <p className="text-charcoal">{org.slug}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                {isEditing ? (
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as OrgStatus })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-charcoal capitalize">{org.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Plan Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  />
                ) : (
                  <p className="text-charcoal">{org.plan_name || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Billing Status
                </label>
                {isEditing ? (
                  <select
                    value={formData.billing_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing_status: e.target.value as BillingStatus,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  >
                    {BILLING_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-charcoal capitalize">{org.billing_status.replace('_', ' ')}</p>
                )}
              </div>

              {isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Billing Provider
                    </label>
                    <input
                      type="text"
                      value={formData.billing_provider}
                      onChange={(e) =>
                        setFormData({ ...formData, billing_provider: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                      placeholder="e.g., stripe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Billing Customer ID
                    </label>
                    <input
                      type="text"
                      value={formData.billing_customer_id}
                      onChange={(e) =>
                        setFormData({ ...formData, billing_customer_id: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                    />
                  </div>
                </>
              )}

              {/* Specialisations */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Specialisations</label>
                {org.specialisations && org.specialisations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {org.specialisations.map((spec: OrgSpecialisation) => (
                      <span key={spec} className="px-3 py-1 text-sm bg-copper/10 text-copper rounded-full font-medium">
                        {SPECIALISATION_LABELS[spec] || spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate">Not configured</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-slate">
                  <strong>Created:</strong> {new Date(org.created_at).toLocaleString('en-ZA')}
                </p>
                <p className="text-sm text-slate">
                  <strong>Updated:</strong> {new Date(org.updated_at).toLocaleString('en-ZA')}
                </p>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h2>
            {activity && activity.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activity.map((item: any) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-charcoal">{item.action}</p>
                        {item.details && (
                          <p className="text-slate mt-1 text-xs">
                            {JSON.stringify(item.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate">
                        {new Date(item.created_at).toLocaleString('en-ZA')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate">No recent activity</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-heading font-bold text-charcoal mb-4">Statistics</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate" />
                  <span className="text-sm text-charcoal">Members</span>
                </div>
                <span className="text-lg font-bold text-charcoal">
                  {org.member_count || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate" />
                  <span className="text-sm text-charcoal">Cases</span>
                </div>
                <span className="text-lg font-bold text-charcoal">{org.case_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate" />
                  <span className="text-sm text-charcoal">Evidence</span>
                </div>
                <span className="text-lg font-bold text-charcoal">
                  {org.evidence_count || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members ({members?.length || 0})
            </h2>
            {members && members.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member: any) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 rounded-lg p-2 text-sm"
                  >
                    <p className="font-medium text-charcoal">
                      {member.user?.email || 'Unknown User'}
                    </p>
                    <p className="text-xs text-slate capitalize">{member.role}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate text-sm">No members</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
