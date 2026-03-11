/**
 * User detail page (admin)
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser, useUpdateUser, useTriggerPasswordReset } from '@/hooks/use-users'
import { ArrowLeft, Save, User, Building2, Key, Edit2 } from 'lucide-react'

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [isEditing, setIsEditing] = useState(false)

  const { data: user, isLoading } = useUser(userId)
  const updateUser = useUpdateUser()
  const triggerPasswordReset = useTriggerPasswordReset()

  const [formData, setFormData] = useState({
    disabled: false,
  })

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({
        userId,
        updates: {
          disabled: formData.disabled || undefined,
        },
      })
      setIsEditing(false)
      alert('User update logged (requires admin API for actual disable/enable)')
    } catch (error: any) {
      alert(error.message || 'Failed to update user')
    }
  }

  const handlePasswordReset = async () => {
    if (confirm('Are you sure you want to trigger a password reset for this user?')) {
      try {
        await triggerPasswordReset.mutateAsync(userId)
        alert('Password reset logged (requires admin API for actual reset)')
      } catch (error: any) {
        alert(error.message || 'Failed to trigger password reset')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading user...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-charcoal">User not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Users
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-charcoal">{user.email}</h1>
            <p className="text-slate mt-1">User Details</p>
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
                disabled={updateUser.isPending}
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
          {/* User Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              User Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                <p className="text-charcoal">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">User ID</label>
                <p className="text-charcoal font-mono text-sm">{user.id}</p>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.disabled ? 'disabled' : 'enabled'}
                    onChange={(e) =>
                      setFormData({ ...formData, disabled: e.target.value === 'disabled' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <p className="text-xs text-slate mt-1">
                    Note: Actual disable/enable requires Supabase Admin API access
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-slate">
                  <strong>Created:</strong> {new Date(user.created_at).toLocaleString('en-ZA')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handlePasswordReset}
                disabled={triggerPasswordReset.isPending}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors w-full"
              >
                <Key className="w-4 h-4" />
                Trigger Password Reset
              </button>
              <p className="text-xs text-slate">
                Note: Actual password reset requires Supabase Admin API access
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organisation Memberships */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organisations ({user.orgs?.length || 0})
            </h2>
            {user.orgs && user.orgs.length > 0 ? (
              <div className="space-y-2">
                {user.orgs.map((org) => (
                  <div
                    key={org.id}
                    className="border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <p className="font-medium text-charcoal">{org.name}</p>
                    <p className="text-xs text-slate capitalize mt-1">Role: {org.role}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate text-sm">No organisation memberships</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
