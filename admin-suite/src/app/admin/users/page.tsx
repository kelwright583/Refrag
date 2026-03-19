/**
 * Users list page (admin)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsers } from '@/hooks/use-users'
import { UserWithOrgs } from '@/lib/types/admin'
import { Search, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/formatting'

export default function UsersPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: users, isLoading } = useUsers(searchQuery || undefined)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Users</h1>
        <p className="text-slate mt-1">Manage all users</p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
          />
        </div>
      </div>

      {/* Users List */}
      {users && users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <User className="w-16 h-16 text-slate mx-auto mb-4" />
          <p className="text-slate">No users found</p>
        </div>
      )}
    </div>
  )
}

/**
 * User Card Component
 */
function UserCard({ user }: { user: UserWithOrgs }) {
  const router = useRouter()

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:border-copper transition-colors cursor-pointer"
      onClick={() => router.push(`/admin/users/${user.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-heading font-bold text-charcoal">{user.email}</h2>
          </div>

          {user.orgs && user.orgs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {user.orgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  <Building2 className="w-3 h-3 text-slate" />
                  <span className="text-charcoal">{org.name}</span>
                  <span className="text-slate text-xs">({org.role})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-right text-sm text-slate">
          <p>Created: {formatDate(user.created_at)}</p>
          <p className="mt-1">{user.orgs?.length || 0} organisation(s)</p>
        </div>
      </div>
    </div>
  )
}
